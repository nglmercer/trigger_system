import type { LSPContext } from '../lsp/types.ts';
/** Get type summary from data */
export function getDataSummary(data: LSPContext): { keys: number; types: string[] } {
  if (!data || typeof data !== 'object') {
    return { keys: 0, types: ['unknown'] };
  }
  
  const keys = Object.keys(data).length;
  const typeSet = new Set<string>();
  
  const inspect = (obj: unknown, depth = 0) => {
    if (depth > 3) return; // Limit recursion
    if (obj === null) { typeSet.add('null'); return; }
    if (Array.isArray(obj)) { typeSet.add('array'); return; }
    if (typeof obj === 'object') {
      typeSet.add('object');
      Object.values(obj).forEach(v => inspect(v, depth + 1));
      return;
    }
    typeSet.add(typeof obj);
  };
  
  inspect(data);
  return { keys, types: Array.from(typeSet) };
}

const defaultOptions = {
    onSuccess: (data: LSPContext, sourceName: string) => console.log('Fetch success', sourceName),
    onError: (error: Error) => console.error('Fetch error', error),
};

/**
 * Reusable function to fetch JSON data from a URL
 */
export async function fetchData(
  url: string, 
  headers?: Record<string, string>,
  options = defaultOptions
): Promise<LSPContext> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    if (!json || typeof json !== 'object') {
      throw new Error('Response is not a valid JSON object');
    }

    const sourceName = new URL(url).pathname.split('/').pop() || 'data.json';
    options.onSuccess?.(json, sourceName);
    
    return json;
  } catch (e) {
    const error = e instanceof Error ? e : new Error('Unknown fetch error');
    options.onError?.(error);
    throw error;
  }
}
// Type for param values - using any for flexibility in the editor
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Single param entry
export interface ParamEntry {
  key: string;
  value: JsonValue;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
  id: string;
}

export const entriesToJson = (ents: ParamEntry[]): string => {
  const root: any = {};
  
  // Ordenar por longitud de key para procesar padres antes que hijos
  const sorted = [...ents].sort((a, b) => a.key.length - b.key.length);

  for (const entry of sorted) {
    const keys = entry.key.split('.');
    let current = root;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!k) continue;
      // Si no existe o es un valor primitivo, lo convertimos a objeto para poder añadir hijos
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      // Evitamos sobrescribir objetos si ya existen con hijos
      if (entry.type === 'object' && typeof current[lastKey] === 'object') {
         // Preservar estructura existente
         current[lastKey] = { ...current[lastKey], ...(entry.value as object) };
      } else {
         current[lastKey] = entry.value;
      }
    }
  }
  return JSON.stringify(root, null, 2);
};
export const generateId = () => Math.random().toString(36).substring(2, 9);

export function parseParams(jsonStr: string): ParamEntry[] {
  try {
    const parsed = JSON.parse(jsonStr || '{}');
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return [];
    }
    
    const entries: ParamEntry[] = [];
    
    function flatten(obj: { [key: string]: JsonValue }, prefix = ''): void {
      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const type = getValueType(val as JsonValue);
        
        if (type === 'object' && val !== null && typeof val === 'object' && Object.keys(val).length > 0) {
          entries.push({ key: fullKey, value: {}, type: 'object', id: generateId() });
          flatten(val as { [key: string]: JsonValue }, fullKey);
        } else if (type === 'array' && Array.isArray(val) && val.length > 0) {
          entries.push({ key: fullKey, value: val as JsonValue, type, id: generateId() });
        } else {
          entries.push({ key: fullKey, value: val as JsonValue, type, id: generateId() });
        }
      }
    }
    
    flatten(parsed as { [key: string]: JsonValue });
    return entries;
  } catch {
    return [];
  }
}

export function getValueType(val: JsonValue): ParamEntry['type'] {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  return 'string';
}

export function valueToString(val: JsonValue): string {
  if (val === null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function stringToValue(str: string, type: ParamEntry['type']): JsonValue {
  switch (type) {
    case 'number':
      return str === '' ? 0 : parseFloat(str) || 0;
    case 'boolean':
      return str === 'true' || str === '1';
    case 'array':
    case 'object':
      return str;
    default:
      return str;
  }
}
