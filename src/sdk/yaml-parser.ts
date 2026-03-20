/**
 * YAML Parser for Trigger Rules
 * 
 * This module provides a reusable YAML parser that converts YAML content
 * into TriggerRule objects with proper validation.
 * 
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use the modularized version at src/sdk/yaml/ instead.
 * 
 * The parser:
 * 1. Parses YAML using the yaml library
 * 2. Normalizes the structure (handles aliases like 'actions' -> 'do')
 * 3. Validates using TriggerValidator
 * 4. Returns a valid TriggerRule or throws/returns errors
 */

// Re-export everything from the new modularized yaml parser
export * from './yaml';

// Re-export type aliases (these are types that were previously exported as interfaces)
export type { 
  YamlParserOptions, 
  YamlParserResult, 
  YamlParserError,
  EditorNodeType,
  EditorNode,
  EditorEdge,
  TriggerRuleToNodesResult
} from './yaml';
