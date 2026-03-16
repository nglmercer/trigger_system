import type { JsonValue, LSPContext, CompletionItem, HoverInfo } from './types.ts';

// ─── Internal state ───────────────────────────────────────────────────────────
let _context: LSPContext = {};
const _listeners = new Set<() => void>();

// ─── Utilities ────────────────────────────────────────────────────────────────
function getKind(val: JsonValue): CompletionItem['kind'] {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  return typeof val as CompletionItem['kind'];
}

function formatDisplay(val: JsonValue): string {
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(val, null, 2);
  }
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

/**
 * Recursively builds a flat list of dot-notation paths from an object.
 * Forces all paths to be prefixed under "data.*".
 */
function buildPaths(obj: JsonValue, prefix: string, out: CompletionItem[]): void {
  // Always emit the prefix itself with its type
  const kind = getKind(obj);
  out.push({
    label: prefix,
    kind,
    detail: kind,
    documentation: typeof obj === 'object' && obj !== null
      ? JSON.stringify(obj, null, 2).slice(0, 200)
      : String(obj)
  });

  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, child] of Object.entries(obj)) {
      buildPaths(child as JsonValue, `${prefix}.${key}`, out);
    }
  }
}

/**
 * Resolves a dot-notation path like "data.user.name" against the current context.
 * Handles the case where context is already wrapped under "data" key.
 */
function resolvePath(path: string): JsonValue | undefined {
  const keys = path.split('.');

  // Determine which root to walk from
  // If context has a single "data" key, and path starts with "data", unwrap it
  const hasNativeData =
    _context &&
    'data' in _context &&
    Object.keys(_context).length === 1;

  let current: JsonValue = hasNativeData
    ? (_context as Record<string, JsonValue>)
    : ({ data: _context } as Record<string, JsonValue>);

  for (const key of keys) {
    if (current !== null && typeof current === 'object' && !Array.isArray(current)) {
      if (key in current) {
        current = (current as Record<string, JsonValue>)[key]!;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return current;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load a new JSON context into the LSP engine */
export function loadContext(data: LSPContext): void {
  _context = data;
  _listeners.forEach(fn => fn());
}

/** Get the raw context data */
export function getContext(): LSPContext {
  return _context;
}

/** Subscribe to context changes. Returns an unsubscribe function. */
export function onContextChange(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * Get all completion items for a given partial term.
 * @param term - What the user has typed after ${ (e.g. "data.us")
 */
export function getCompletions(term: string): CompletionItem[] {
  if (!_context || typeof _context !== 'object') return [];

  const all: CompletionItem[] = [];

  // Determine if the context is already wrapped in a "data" key
  const contextKeys = Object.keys(_context);
  const hasNativeData =
    contextKeys.length === 1 && contextKeys[0] === 'data';

  if (hasNativeData) {
    // Context = { data: { ... } } — build from context.data under "data" prefix
    const dataVal = (_context as Record<string, JsonValue>)['data'];
    if (dataVal !== undefined) buildPaths(dataVal, 'data', all);
  } else {
    // Context is flat — treat entire context as the "data" root
    buildPaths(_context as JsonValue, 'data', all);
  }

  // Deduplicate by label (safety net)
  const seen = new Set<string>();
  const unique = all.filter(item => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });

  const lterm = term.toLowerCase();
  return unique
    .filter(item => item.label.toLowerCase().includes(lterm))
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(lterm);
      const bStarts = b.label.toLowerCase().startsWith(lterm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      const aDepth = (a.label.match(/\./g) || []).length;
      const bDepth = (b.label.match(/\./g) || []).length;
      return aDepth !== bDepth ? aDepth - bDepth : a.label.localeCompare(b.label);
    })
    .slice(0, 10);
}

/**
 * Get hover info for a fully-resolved variable path.
 * @param variable - e.g. "data.user.name"
 */
export function getHoverInfo(variable: string): HoverInfo | undefined {
  const val = resolvePath(variable);
  if (val === undefined) return undefined;
  return {
    variable,
    value: val,
    kind: getKind(val),
    display: formatDisplay(val)
  };
}

/**
 * Extract all ${var} expressions from a string value.
 */
export function extractVariables(text: string): string[] {
  const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
  const found: string[] = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (!found.includes(m[1]!)) found.push(m[1]!);
  }
  return found;
}

/**
 * Find which ${var} the given character offset falls inside.
 */
export function findVariableAtOffset(text: string, offset: number): string | undefined {
  const regex = /\$\{([a-zA-Z0-9_.]+)\}/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (offset >= m.index && offset <= m.index + m[0].length) {
      return m[1];
    }
  }
  return undefined;
}

/**
 * Get the first ${var} in a piece of text (useful for single-var hover hints).
 */
export function findFirstVariable(text: string): string | undefined {
  const m = text.match(/\$\{([a-zA-Z0-9_.]+)\}/);
  return m ? m[1] : undefined;
}

/**
 * Detect trigger state for autocomplete popup.
 * Returns the current partial term being typed, or null if not in a variable expression.
 */
export function getCompletionTrigger(text: string): string | null | undefined {
  // Must end with $, ${, or ${partial (not yet closed with })
  if (text.endsWith('}')) return null;

  const match = text.match(/\$\{?([a-zA-Z0-9_.]*)$/);
  if (!match) return null;

  const dollarIdx = text.lastIndexOf('$');
  const spaceIdx = text.lastIndexOf(' ');
  if (dollarIdx === -1) return null;
  // Don't trigger if there's a space after the last $
  if (spaceIdx > dollarIdx) return null;

  return match[1]; // The partial term (could be empty string)
}

/**
 * Build the completed text after a user selects a completion item.
 */
export function applyCompletion(text: string, item: CompletionItem): string {
  const trigger = getCompletionTrigger(text);
  if (trigger === null) return text;

  const match = text.match(/\$\{?([a-zA-Z0-9_.]*)$/);
  if (!match) return text;

  const prefix = text.substring(0, text.length - match[0].length);
  return `${prefix}\${${item.label}}`;
}
