/**
 * Shared File Picker Utility
 * 
 * This module provides a reusable file picker for importing files.
 * It centralizes the file input creation and event handling logic
 * to avoid code duplication between JSON and YAML importers.
 */

import type { FilePickerOptions, ImportResponse, ImportError, ImportResult, ImportErrorCode } from './importExportTypes';
import { createImportError } from './importExportTypes';

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse error with line information if available
 */
export interface ParseError extends Error {
  line?: number;
  column?: number;
}

/**
 * Check if an error is a ParseError with line info
 */
export function isParseError(error: unknown): error is ParseError {
  return error instanceof Error && 'line' in error;
}

/**
 * Create an import response from a successful result
 */
export function successResponse(data: ImportResult): ImportResponse {
  return { success: true, data };
}

/**
 * Create an import response from an error
 */
export function errorResponse(
  message: string,
  code: ImportErrorCode,
  options?: { line?: number; field?: string }
): ImportResponse {
  return { success: false, error: createImportError(message, code, options) };
}

// ============================================================================
// File Reading
// ============================================================================

/**
 * Read a file as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

/**
 * Read a file as JSON and parse it
 */
export async function readFileAsJson<T = unknown>(file: File): Promise<T> {
  const text = await readFileAsText(file);
  return JSON.parse(text);
}

// ============================================================================
// File Picker Factory
// ============================================================================

/**
 * Default accepted file types
 */
const DEFAULT_ACCEPT = ['.json', '.yaml', '.yml'];

/**
 * Create a file picker that calls a parser function
 * 
 * @param options - File picker configuration
 * @param parser - Function to parse the file content
 * @returns Promise resolving to ImportResponse
 */
export function createFilePicker<T>(
  options: FilePickerOptions,
  parser: (content: string, filename: string) => ImportResponse
): Promise<ImportResponse> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept.join(',');
    input.multiple = options.multiple ?? false;

    // Style to hide but keep functional
    Object.assign(input.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      opacity: '0',
    });

    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        resolve(errorResponse(
          'No file selected',
          'FILE_READ_ERROR' as ImportErrorCode
        ));
        return;
      }

      try {
        const text = await readFileAsText(file);
        const result = parser(text, file.name);
        resolve(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const line = isParseError(err) ? err.line : undefined;
        
        resolve(errorResponse(
          `Failed to parse file: ${message}`,
          'PARSE_ERROR' as ImportErrorCode,
          { line }
        ));
      }

      // Clean up
      document.body.removeChild(input);
    };

    // Handle cancellation
    input.oncancel = () => {
      resolve(errorResponse(
        'File selection cancelled',
        'FILE_READ_ERROR' as ImportErrorCode
      ));
    };

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Simplified file picker for JSON files
 */
export function createJsonFilePicker(
  parser: (content: string, filename: string) => ImportResponse
): Promise<ImportResponse> {
  return createFilePicker({ accept: ['.json'] }, parser);
}

/**
 * Simplified file picker for YAML files
 */
export function createYamlFilePicker(
  parser: (content: string, filename: string) => ImportResponse
): Promise<ImportResponse> {
  return createFilePicker({ accept: ['.yaml', '.yml'] }, parser);
}

// ============================================================================
// Download Utilities
// ============================================================================

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download content as JSON file
 */
export function downloadJson(content: string, filename: string): void {
  downloadFile(content, filename, 'application/json');
}

/**
 * Download content as YAML file
 */
export function downloadYaml(content: string, filename: string): void {
  downloadFile(content, filename, 'text/yaml');
}

/**
 * Download content as text file
 */
export function downloadText(content: string, filename: string): void {
  downloadFile(content, filename, 'text/plain');
}
