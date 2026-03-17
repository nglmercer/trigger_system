/** Supported JSON value types */
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/** A single autocomplete suggestion item */
export interface CompletionItem {
  label: string;         // The full path, e.g. "data.user.name"
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  detail?: string;       // Short type description
  documentation?: string; // Preview of the value
  value?: JsonValue;     // The actual value (for value-mode completions)
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
