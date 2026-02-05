import {
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';
import {
  TextDocument
} from 'vscode-languageserver-textdocument';
import { parseDocument, isMap, isSeq, YAMLMap, YAMLSeq } from 'yaml';
import type { Node, Pair, Scalar } from 'yaml';
import { TriggerValidator } from '../domain/validator';
import { parseDirectives, isDiagnosticSuppressed, processRangeDirectives, getImportDirectives } from './directives';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import * as path from 'path';
import { resolveImportPath } from './path-utils';

/**
 * Validates the text content of a document and returns diagnostics.
 * Extracted for easier testing without the full LSP connection mock.
 */
export async function getDiagnosticsForText(text: string): Promise<Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  
  // Create a minimal TextDocument object for position calculation
  // We use the library one if accessible, but for simple calculation this is enough.
  const textDocument = TextDocument.create("file://test", "yaml", 1, text);

  // Parse directives from comments
  const directives = processRangeDirectives(parseDirectives(textDocument));

  // Parse YAML with CST (Concrete Syntax Tree) from 'yaml' package
  const doc = parseDocument(text);
  
  // 0. CHECK ACTIVATION STATUS
  // The user requested: "Default disabled, activate via # @ directive OR if valid rule detected"
  // If invalid (not a rule file), disable by default to avoid false positives.

  // Check 1: Explicit Activation via Directives (# @...)
  const hasDirectives = directives.length > 0;
  
  // Check 2: Implicit Activation via File Structure Heuristic
  let looksLikeTriggerFile = false;
  try {
      const json = doc.toJS();
      if (json && typeof json === 'object') {
          // Case A: Array of rules
          if (Array.isArray(json)) {
              // Check if at least one item looks like a rule (has 'id' and ('on' or 'do' or 'if'))
              looksLikeTriggerFile = json.some(item => 
                  item && typeof item === 'object' && item.id
              );
          } 
          // Case B: Wrapper object with "rules" property
          else if (json.rules && Array.isArray(json.rules)) {
              looksLikeTriggerFile = true;
          }
          // Case C: Single rule object
          else if (json.id && (json.on || json.do || json.if)) {
              looksLikeTriggerFile = true;
          }
      }
  } catch (e) {
      // If we can't parse to JS, we can't verify structure.
      // If it has syntax errors, relying on "hasDirectives" is the fallback.
  }

  const shouldValidate = hasDirectives || looksLikeTriggerFile;

  if (!shouldValidate) {
      // Return empty diagnostics if not activated
      return [];
  }

  // 1. Syntax Errors
  if (doc.errors.length > 0) {
      for (const err of doc.errors) {
          const diagnostic: Diagnostic = {
              severity: DiagnosticSeverity.Error,
              range: {
                  start: textDocument.positionAt(err.pos[0]),
                  end: textDocument.positionAt(err.pos[1])
              },
              message: err.message,
              source: 'yaml-parser'
          };
          
          // Check if diagnostic is suppressed
          const line = diagnostic.range.start.line;
          if (!isDiagnosticSuppressed(line, directives, 'yaml-parser')) {
              diagnostics.push(diagnostic);
          }
      }
  }

  // 1.5 Check for multi-document YAML and suggest list format
  // Multi-document separator is '---' (on its own line after the first document)
  const lines = text.split('\n');
  let foundFirstDocument = false;
  for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      
      // Skip initial '---' (YAML document start marker)
      if (i === 0 && line === '---') {
          foundFirstDocument = true;
          continue;
      }
      
      // If we find '---' after content, it's a multi-document file
      if (line === '---' && foundFirstDocument) {
          const lineStartOffset = text.split('\n').slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
          
          // Check if suppressed
          if (!isDiagnosticSuppressed(i, directives, 'trigger-best-practices')) {
              diagnostics.push({
                  severity: DiagnosticSeverity.Information,
                  range: {
                      start: textDocument.positionAt(lineStartOffset),
                      end: textDocument.positionAt(lineStartOffset + line.length)
                  },
                  message: 'Multi-document YAML detected. Consider using list format (- id: ...) for better compatibility and clearer semantics.',
                  source: 'trigger-best-practices',
                  tags: [1] // DiagnosticTag.Unnecessary would be [1] - marks as hint
              });
          }
          break; // Only show once per file
      }
      
      // Track that we've seen content
      if (line.length > 0 && !line.startsWith('#')) {
          foundFirstDocument = true;
      }
  }


  // 1.6 Validate import directives
  const importDiagnostics = validateImportDirectives(textDocument, text);
  for (const diagnostic of importDiagnostics) {
      // Check if diagnostic is suppressed
      const line = diagnostic.range.start.line;
      if (!isDiagnosticSuppressed(line, directives, 'trigger-import-validator')) {
          diagnostics.push(diagnostic);
      }
  }


  // 2. Semantic Validation (ArkType)
  // We attempt validation even if there are syntax errors
  try {
      const json = doc.toJS();
      if (json && typeof json === 'object') {
          // Handle Wrapper Object (Headers), Array of Rules, or Single Rule
          let items: any[] = [];
          
          // Check if it's a wrapper object with "rules"
          const isWrapper = !Array.isArray(json) && json.rules && Array.isArray(json.rules);
          const isArray = Array.isArray(json);

          if (isWrapper) {
              items = json.rules;
          } else {
              items = isArray ? json : [json];
          }
          
          items.forEach((item, index) => {
               // Check for missing 'id' field
               if (item && typeof item === 'object' && !item.id) {
                   let fullPathParts = ['id'];
                   
                   if (isWrapper) {
                       fullPathParts.unshift(String(index));
                       fullPathParts.unshift('rules');
                   } else if (isArray) {
                       fullPathParts.unshift(String(index));
                   }
                   
                   const range = findRangeForPath(doc.contents, fullPathParts.slice(0, -1), textDocument);
                   const line = range.start.line;
                   
                   if (!isDiagnosticSuppressed(line, directives, 'trigger-validator')) {
                       diagnostics.push({
                           severity: DiagnosticSeverity.Error,
                           range: range,
                           message: 'Rule is missing required field: id. Every rule must have a unique identifier.',
                           source: 'trigger-validator'
                       });
                   }
               }
               
               if (item && typeof item === 'object' && item.actions && !item.do) {
                   item.do = item.actions;
               }

               const result = TriggerValidator.validate(item);
               if (!result.valid) {
                   for (const issue of result.issues) {
                       let fullPathParts = issue.path.split('.');
                       
                       if (isWrapper) {
                           fullPathParts.unshift(String(index));
                           fullPathParts.unshift('rules');
                       } else if (isArray) {
                           fullPathParts.unshift(String(index));
                       }
                       
                       const range = findRangeForPath(doc.contents, fullPathParts, textDocument);
                       const line = range.start.line;
                       
                       if (!isDiagnosticSuppressed(line, directives, 'trigger-validator')) {
                           diagnostics.push({
                               severity: DiagnosticSeverity.Error,
                               range: range,
                               message: issue.message + (issue.suggestion ? ` (Suggestion: ${issue.suggestion})` : ''),
                               source: 'trigger-validator'
                           });
                       }
                   }
               }
          });
      }
  } catch (e) {
      // verification failed, likely due to severe syntax errors, which are already reported.
  }
  return diagnostics;
}


function findRangeForPath(
    contents: Node | null, 
    pathParts: string[], 
    textDocument: TextDocument
): { start: { line: number, character: number }, end: { line: number, character: number } } {
    
    let current: Node | null = contents;
    let parentNode: Node | null = null;
    let lastFoundIndex = -1;
    
    for (let i = 0; i < pathParts.length; i++) {
        const key = pathParts[i];
        if (!current) break;
        
        parentNode = current; // Keep track of parent
        lastFoundIndex = i;
        
        if (isMap(current)) {
            // current is YAMLMap
            const pair = current.items.find((p: Pair) => {
                if (isScalar(p.key) && String(p.key.value) === key) return true;
                return false;
            });
            if (pair && pair.value) {
                current = pair.value as Node; 
            } else {
                // Key not found in map
                current = null;
                break;
            }
        } else if (isSeq(current)) {
            // current is YAMLSeq
            const idx = parseInt(key!);
            if (!isNaN(idx) && current.items[idx]) {
                current = current.items[idx] as Node;
            } else {
                current = null;
                break;
            }
        } else {
            current = null;
            break;
        }
    }

    // If we found the node, return its range
    // NOTE: Only Node types have range, not Pair types
    if (current && current.range) {
        return {
            start: textDocument.positionAt(current.range[0]),
            end: textDocument.positionAt(current.range[1])
        };
    }

    // If we couldn't find the exact path, but found a parent, use parent's range
    // This happens when a required field is missing
    if (parentNode && parentNode.range) {
        // Try to find the specific key that's missing
        const missingKey = pathParts[lastFoundIndex + 1];
        
        // If the parent is a map and we know which key is missing
        if (isMap(parentNode) && missingKey) {
            // Position the error after the last item in the map
            // This gives better context than position (0,0)
            const lastItem = parentNode.items[parentNode.items.length - 1];
            // Pairs don't have range, but their value nodes do
            if (lastItem && 'value' in lastItem && lastItem.value) {
                const valueNode = lastItem.value as Node;
                if (valueNode.range) {
                    const pos = textDocument.positionAt(valueNode.range[1]);
                    return {
                        start: pos,
                        end: pos
                    };
                }
            }
        }
        
        // Otherwise use the start of the parent node
        if ('range' in parentNode && parentNode.range) {
            return {
                start: textDocument.positionAt(parentNode.range[0]),
                end: textDocument.positionAt(parentNode.range[0])
            };
        }
    }

    // Last resort: try to find the rule that has the issue
    // For array indices, go back and find the rule
    if (pathParts.length > 0 && !isNaN(parseInt(pathParts[0]!))) {
        const ruleIndex = parseInt(pathParts[0]!);
        if (isSeq(contents) && contents.items[ruleIndex]) {
            const ruleNode = contents.items[ruleIndex] as Node;
            if (ruleNode && 'range' in ruleNode && ruleNode.range) {
                return {
                    start: textDocument.positionAt(ruleNode.range[0]),
                    end: textDocument.positionAt(ruleNode.range[0])
                };
            }
        }
    }

    // Absolute fallback
    return {
         start: textDocument.positionAt(0),
         end: textDocument.positionAt(0)
    };
}

function isScalar(node: any): node is Scalar {
    return node && node.type !== undefined && (node.type === 'SCALAR' || node.type === 'QUOTE_DOUBLE' || node.type === 'QUOTE_SINGLE' || typeof node.value !== 'undefined');
}

/**
 * Validate import directives and return diagnostics for invalid imports
 */
function validateImportDirectives(document: TextDocument, text: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const directives = parseDirectives(document);
    
    for (const directive of directives) {
        if (directive.type === 'import' && directive.importPath) {
            try {
                const resolvedPath = resolveImportPath(document.uri, directive.importPath, []);
                
                // Check if file exists
                if (!existsSync(resolvedPath)) {
                    // Find the line and character position of the import path in the directive
                    const lines = text.split('\n');
                    const line = lines[directive.line] || '';
                    const importPathMatch = line.match(new RegExp(`['"]${directive.importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
                    
                    let startChar = line.indexOf(directive.importPath);
                    let endChar = startChar + directive.importPath.length;
                    
                    if (importPathMatch) {
                        startChar = importPathMatch.index || startChar;
                        endChar = startChar + importPathMatch[0].length;
                    }
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: directive.line, character: startChar },
                            end: { line: directive.line, character: endChar }
                        },
                        message: `Import file not found: ${directive.importPath}`,
                        source: 'trigger-import-validator',
                        data: {
                            suggestion: `Check that the file exists at the specified path: ${resolvedPath}`
                        }
                    });
                    continue;
                }
                
                // Check file extension
                const ext = extname(resolvedPath).toLowerCase();
                const validExtensions = ['.json', '.yaml', '.yml'];
                
                if (!validExtensions.includes(ext)) {
                    const lines = text.split('\n');
                    const line = lines[directive.line] || '';
                    const importPathMatch = line.match(new RegExp(`['"]${directive.importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
                    
                    let startChar = line.indexOf(directive.importPath);
                    let endChar = startChar + directive.importPath.length;
                    
                    if (importPathMatch) {
                        startChar = importPathMatch.index || startChar;
                        endChar = startChar + importPathMatch[0].length;
                    }
                    
                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: { line: directive.line, character: startChar },
                            end: { line: directive.line, character: endChar }
                        },
                        message: `Invalid file type for import: ${ext}. Only JSON and YAML files are supported.`,
                        source: 'trigger-import-validator',
                        data: {
                            suggestion: 'Use a .json, .yaml, or .yml file for data imports.'
                        }
                    });
                }
            } catch (error) {
                console.error(`[LSP] Error validating import directive:`, error);
            }
        }
    }
    return diagnostics;
}
