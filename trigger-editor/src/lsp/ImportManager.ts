/**
 * ImportManager - Singleton para gestión autónoma de imports.
 * No depende del ciclo de vida de componentes React.
 * Carga datos desde localStorage al inicializar y mantiene sincronizado el LSP engine.
 */
import { loadImports } from './engine.ts';
import type { ImportConfig, ImportMode, LSPContext } from './types.ts';

const STORAGE_KEY = 'trigger-editor-imports';

/** Representación de un import en localStorage */
export interface StoredImport {
  id: string;
  alias: string;
  mode: ImportMode;
  data: LSPContext;
  filename: string;
  url?: string;
  headers?: Record<string, string>;
  lastUpdated?: number;
}

/** Callback para notificar cambios en los imports */
type ImportChangeListener = (imports: StoredImport[]) => void;

class ImportManagerImpl {
  private _imports: StoredImport[] = [];
  private _listeners = new Set<ImportChangeListener>();
  private _initialized = false;

  /** Inicializa el manager. Carga datos desde localStorage. */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;

    this._loadFromStorage();
    this._syncToLSP();
  }

  /** Carga imports desde localStorage */
  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredImport[];
        if (Array.isArray(parsed)) {
          this._imports = parsed;
        }
      }
    } catch (e) {
      console.warn('[ImportManager] Failed to load imports from storage:', e);
      this._imports = [];
    }
  }

  /** Sincroniza el contexto actual al LSP engine */
  private _syncToLSP(): void {
    const configs: ImportConfig[] = this._imports.map(i => ({
      id: i.id.toString(),
      alias: i.alias,
      data: i.data,
      mode: i.mode
    }));
    loadImports(configs);
  }

  /** Guarda imports a localStorage y notifica listeners */
  private _saveAndNotify(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._imports));
    } catch (e) {
      console.warn('[ImportManager] Failed to save imports:', e);
    }
    this._syncToLSP();
    this._listeners.forEach(fn => fn(this._imports));
  }

  /** Obtiene todos los imports */
  getImports(): StoredImport[] {
    return [...this._imports];
  }

  /** Agrega o actualiza un import */
  setImport(entry: StoredImport): void {
    const index = this._imports.findIndex(i => i.id === entry.id);
    if (index >= 0) {
      this._imports[index] = { ...this._imports[index], ...entry };
    } else {
      this._imports.push(entry);
    }
    this._saveAndNotify();
  }

  /** Agrega o actualiza un import por alias (para API externa) */
  setImportByAlias(alias: string, data: LSPContext, mode: ImportMode = 'path', filename = 'External API'): void {
    const existing = this._imports.find(i => i.alias === alias);
    const entry: StoredImport = {
      id: existing?.id || `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      alias,
      mode,
      data,
      filename,
      lastUpdated: Date.now()
    };
    this.setImport(entry);
  }

  /** Elimina un import por id */
  removeImport(id: string): boolean {
    const len = this._imports.length;
    this._imports = this._imports.filter(i => i.id !== id);
    if (this._imports.length !== len) {
      this._saveAndNotify();
      return true;
    }
    return false;
  }

  /** Elimina un import por alias */
  removeImportByAlias(alias: string): boolean {
    const len = this._imports.length;
    this._imports = this._imports.filter(i => i.alias !== alias);
    if (this._imports.length !== len) {
      this._saveAndNotify();
      return true;
    }
    return false;
  }

  /** Actualiza un import existente */
  updateImport(id: string, updates: Partial<StoredImport>): boolean {
    const index = this._imports.findIndex(i => i.id === id);
    if (index >= 0) {
      if (!this._imports[index]) return false;
      this._imports[index] = { ...this._imports[index], ...updates };
      this._saveAndNotify();
      return true;
    }
    return false;
  }

  /** Reemplaza todos los imports (útil para importar desde archivo) */
  replaceAll(imports: StoredImport[]): void {
    this._imports = [...imports];
    this._saveAndNotify();
  }

  /** Limpia todos los imports */
  clear(): void {
    this._imports = [];
    this._saveAndNotify();
  }

  /** Suscribe a cambios en los imports */
  onChange(listener: ImportChangeListener): () => void {
    this._listeners.add(listener);
    // Emitir estado actual inmediatamente
    listener(this._imports);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** Fuerza recarga desde localStorage */
  reload(): void {
    this._loadFromStorage();
    this._syncToLSP();
    this._listeners.forEach(fn => fn(this._imports));
  }
}

/** Instancia singleton del ImportManager */
export const ImportManager = new ImportManagerImpl();

// Inicializar automáticamente al importar el módulo
ImportManager.init();
