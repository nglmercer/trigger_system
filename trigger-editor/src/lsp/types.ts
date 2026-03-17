/** Supported JSON value types */
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Import mode determines how completions are applied:
 * - 'path': Use path reference like ${data.username} (default)
 * - 'value': Use raw value directly (e.g., 1, "text", true)
 */
export type ImportMode = 'path' | 'value';

/**
 * Configuration for an imported data source
 */
export interface ImportConfig {
  /** Unique identifier for this import */
  id: string;
  /** Alias/prefix used in completions (e.g., 'data', 'actions', 'values') */
  alias: string;
  /** The JSON data to use for completions */
  data: LSPContext;
  /** Completion mode - 'path' for ${alias.path} or 'value' for raw value */
  mode: ImportMode;
}

/** A single autocomplete suggestion item */
export interface CompletionItem {
  label: string;         // The full path, e.g. "data.user.name"
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  detail?: string;       // Short type description
  documentation?: string; // Preview of the value
  value?: JsonValue;     // The actual value (for value-mode completions)
  /** Which import this completion belongs to */
  importId?: string;
  /** The mode of the import this completion belongs to */
  importMode?: ImportMode;
}

/** Hover info for a resolved variable */
export interface HoverInfo {
  variable: string;      // The path, e.g. "data.user.name"
  value: JsonValue;      // The resolved value
  kind: CompletionItem['kind'];
  display: string;       // Pre-formatted string for display
}

/** The LSP context (loaded JSON data) */
export type LSPContext = Record<string, JsonValue>;
