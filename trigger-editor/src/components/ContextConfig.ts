import { loadContext, loadImports, getImports, getContext } from '../lsp/engine.ts';
import type { LSPContext, ImportConfig, ImportMode } from '../lsp/types.ts';

// Re-export for convenience
export { loadImports };
export type { ImportConfig, ImportMode };

/**
 * Configuration for a JSON data source with import settings
 */
export interface DataSourceConfig {
  /** Unique identifier for this data source */
  id: string;
  /** Display name for the UI */
  name: string;
  /** Description for the UI */
  description?: string;
  /** Type of data source */
  type: 'file' | 'api' | 'config' | 'custom-api';
  /** The JSON data (for config type) */
  data?: LSPContext;
  /** API endpoint URL (for api type) */
  apiUrl?: string;
  /** Query parameters for API (for api type) */
  queryParams?: Record<string, string>;
  /** Optional headers for API requests */
  headers?: Record<string, string>;
  /**
   * Import mode for this data source:
   * - 'path': Use path reference like ${alias.path} (default)
   * - 'value': Use raw value directly (e.g., 1, "text", true)
   */
  importMode?: ImportMode;
  /**
   * Custom alias/prefix for this import. If not provided, defaults to:
   * - 'data' for contextType 'all'
   * - 'values' for contextType 'values'
   * - 'actions' for contextType 'actionTypes'
   */
  alias?: string;
}

/**
 * Context type for different autocomplete purposes
 */
export type ContextType = 'values' | 'actionTypes' | 'all';

/**
 * Storage key for localStorage - includes context type
 */
export function getStorageKey(contextType: ContextType): string {
  return `${CONTEXT_STORAGE_KEY}-${contextType}`;
}

export const CONTEXT_STORAGE_KEY = 'trigger-editor-last-context';

/**
 * Default built-in data sources
 * Add your JSON configurations here
 */
export const DEFAULT_DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'empty',
    name: 'Empty Context',
    description: 'No autocompletion data',
    type: 'config',
    data: {}
  }
];

/**
 * Load the last used context ID from localStorage for a specific context type
 */
export function getLastContextId(contextType: ContextType = 'all'): string | null {
  try {
    return localStorage.getItem(getStorageKey(contextType));
  } catch {
    return null;
  }
}

/**
 * Save the last used context ID to localStorage for a specific context type
 * Only stores the ID, not the full data, to avoid overloading storage
 */
export function setLastContextId(id: string, contextType: ContextType = 'all'): void {
  try {
    localStorage.setItem(getStorageKey(contextType), id);
  } catch (e) {
    console.warn('Failed to save context to localStorage:', e);
  }
}

/**
 * Fetch data from a REST API endpoint
 */
export async function fetchFromApi(config: DataSourceConfig): Promise<LSPContext> {
  if (!config.apiUrl) {
    throw new Error('API URL is required for API type data source');
  }

  // Build URL with query parameters
  const url = new URL(config.apiUrl);
  if (config.queryParams) {
    Object.entries(config.queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...config.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as LSPContext;
}

/**
 * Load data from a file (FileReader result)
 */
export function loadFromFile(file: File): Promise<LSPContext> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        resolve(json);
      } catch (e) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Get data from a data source based on its type
 */
export async function getDataFromSource(config: DataSourceConfig): Promise<LSPContext> {
  switch (config.type) {
    case 'config':
      return config.data || {};
    case 'api':
      return fetchFromApi(config);
    case 'file':
      // File type requires external file input, not handled here
      throw new Error('File type requires external file input');
    default:
      throw new Error(`Unknown data source type: ${config.type}`);
  }
}

// In-memory storage for contexts by type
const contextStorage: Record<ContextType, LSPContext> = {
  values: {},
  actionTypes: {},
  all: {}
};

// Storage for import configurations (alias and mode)
const importConfigs: Record<ContextType, { alias: string; mode: ImportMode }> = {
  values: { alias: 'values', mode: 'value' },
  actionTypes: { alias: 'actions', mode: 'value' },
  all: { alias: 'data', mode: 'path' }
};

/**
 * Get the default alias for a context type
 */
export function getDefaultAlias(contextType: ContextType): string {
  return importConfigs[contextType].alias;
}

/**
 * Get the default import mode for a context type
 */
export function getDefaultImportMode(contextType: ContextType): ImportMode {
  return importConfigs[contextType].mode;
}

/**
 * Set the import configuration for a context type
 */
export function setImportConfig(contextType: ContextType, alias: string, mode: ImportMode): void {
  importConfigs[contextType] = { alias, mode };
}

/**
 * Set the context data for a specific type and optionally load into LSP engine
 */
export function setContextData(data: LSPContext, contextType: ContextType = 'all', loadToEngine: boolean = true): void {
  contextStorage[contextType] = data;
  
  if (loadToEngine) {
    // Build import configs for all active context types
    const imports: ImportConfig[] = [];
    
    // Add 'all' context if it has data
    if (Object.keys(contextStorage.all).length > 0) {
      imports.push({
        id: 'all',
        alias: importConfigs.all.alias,
        data: contextStorage.all,
        mode: importConfigs.all.mode
      });
    }
    
    // Add 'values' context if it has data
    if (Object.keys(contextStorage.values).length > 0) {
      imports.push({
        id: 'values',
        alias: importConfigs.values.alias,
        data: contextStorage.values,
        mode: importConfigs.values.mode
      });
    }
    
    // Add 'actionTypes' context if it has data
    if (Object.keys(contextStorage.actionTypes).length > 0) {
      imports.push({
        id: 'actionTypes',
        alias: importConfigs.actionTypes.alias,
        data: contextStorage.actionTypes,
        mode: importConfigs.actionTypes.mode
      });
    }
    
    // Load to LSP engine with imports
    if (imports.length > 0) {
      loadImports(imports);
    } else {
      loadContext({});
    }
  }
}

/**
 * Get the current context data for a specific type
 */
export function getContextData(contextType: ContextType = 'all'): LSPContext {
  return contextStorage[contextType];
}

/**
 * Load context from a data source for a specific type
 */
export async function loadContextFromSource(
  config: DataSourceConfig, 
  contextType: ContextType = 'all'
): Promise<LSPContext> {
  const data = await getDataFromSource(config);
  setContextData(data, contextType, true);
  return data;
}
