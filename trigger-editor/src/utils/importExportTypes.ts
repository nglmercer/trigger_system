/**
 * Unified Import/Export Types
 * 
 * This module provides shared types for both JSON and YAML import/export functionality.
 * By centralizing these types, we ensure consistency and avoid code duplication.
 */

import type { Node, Edge } from '@xyflow/react';
import type {
  EventNodeData,
  ConditionNodeData,
  ConditionGroupNodeData,
  ActionNodeData,
  ActionGroupNodeData,
} from '../types';

// ============================================================================
// Core Type Exports
// ============================================================================

export type AppNode = Node<
  | EventNodeData
  | ConditionNodeData
  | ConditionGroupNodeData
  | ActionNodeData
  | ActionGroupNodeData
>;

export type AppNodes = AppNode[];
export type AppEdges = Edge[];

// ============================================================================
// Import Data Types
// ============================================================================

/**
 * Result of a successful import operation
 */
export interface ImportResult {
  nodes: AppNodes;
  edges: AppEdges;
  /** Optional source YAML (for YAML imports that preserve the original) */
  sourceYaml?: string;
  /** Optional metadata about the import */
  metadata?: ImportMetadata;
}

/**
 * Metadata about an import operation
 */
export interface ImportMetadata {
  /** Name of the imported rule (from YAML/JSON) */
  name?: string;
  /** Description of the imported rule */
  description?: string;
  /** Number of nodes imported */
  nodeCount: number;
  /** Number of edges imported */
  edgeCount: number;
  /** Source format (json | yaml) */
  format: 'json' | 'yaml';
  /** Import timestamp */
  importedAt: string;
}

/**
 * Import error with detailed information
 */
export interface ImportError {
  /** Error message */
  message: string;
  /** Error code for programmatic handling */
  code: ImportErrorCode;
  /** Optional line/position information */
  line?: number;
  /** Optional field that caused the error */
  field?: string;
}

/**
 * Error codes for import operations
 */
export enum ImportErrorCode {
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
  INVALID_NODE_TYPE = 'INVALID_NODE_TYPE',
  INVALID_CONDITION = 'INVALID_CONDITION',
  INVALID_ACTION = 'INVALID_ACTION',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Result of an import operation - can be either success or error
 */
export type ImportResponse = 
  | { success: true; data: ImportResult }
  | { success: false; error: ImportError };

// ============================================================================
// Export Data Types
// ============================================================================

/**
 * Export format version for future compatibility
 */
export const EXPORT_VERSION = '1.0.0';

/**
 * Complete export data structure for JSON format
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  nodes: AppNodes;
  edges: AppEdges;
  /** Optional: pre-generated YAML (useful for quick preview) */
  yaml?: string;
  /** Metadata about the export */
  metadata?: ExportMetadata;
}

/**
 * Metadata about an export operation
 */
export interface ExportMetadata {
  name?: string;
  description?: string;
  nodeCount: number;
  edgeCount: number;
}

// ============================================================================
// File Picker Configuration
// ============================================================================

/**
 * Configuration options for file picker
 */
export interface FilePickerOptions {
  /** Accepted file extensions (e.g., ['.json', '.yaml']) */
  accept: string[];
  /** Whether to allow multiple files */
  multiple?: boolean;
  /** Label for the file input */
  label?: string;
}

/**
 * Default file picker configurations
 */
export const FILE_PICKER_DEFAULTS = {
  JSON: { accept: ['.json'] },
  YAML: { accept: ['.yaml', '.yml'] },
  ANY: { accept: ['.json', '.yaml', '.yml'] },
} as const;

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for imported data
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ImportError[];
}

/**
 * Validator function type
 */
export type Validator<T> = (data: unknown) => ValidationResult<T>;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if import response is successful
 */
export function isImportSuccess(response: ImportResponse): response is { success: true; data: ImportResult } {
  return response.success === true;
}

/**
 * Type guard to check if import response is an error
 */
export function isImportError(response: ImportResponse): response is { success: false; error: ImportError } {
  return response.success === false;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an import error
 */
export function createImportError(
  message: string,
  code: ImportErrorCode,
  options?: Partial<Pick<ImportError, 'line' | 'field'>>
): ImportError {
  return { message, code, ...options };
}

/**
 * Create an import result from nodes and edges
 */
export function createImportResult(
  nodes: AppNodes,
  edges: AppEdges,
  options?: { sourceYaml?: string; name?: string; description?: string; format?: 'json' | 'yaml' }
): ImportResult {
  return {
    nodes,
    edges,
    sourceYaml: options?.sourceYaml,
    metadata: {
      name: options?.name,
      description: options?.description,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      format: options?.format || 'json',
      importedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a successful import response
 */
export function successResponse(data: ImportResult): ImportResponse {
  return { success: true, data };
}

/**
 * Create an error import response
 */
export function errorResponse(
  message: string,
  code: ImportErrorCode,
  options?: { line?: number; field?: string }
): ImportResponse {
  return { success: false, error: createImportError(message, code, options) };
}
