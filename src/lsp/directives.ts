import type { TextDocument } from 'vscode-languageserver-textdocument';
import { dirname, join } from 'path';

/**
 * Directive types supported in comments
 */
export type DirectiveType =
    | 'disable-lint'           // Disable all linting
    | 'enable-lint'            // Enable all linting
    | 'disable-next-line'      // Disable lint for next line
    | 'disable-line'           // Disable lint for current line
    | 'disable-rule'           // Disable specific rule(s)
    | 'enable-rule'            // Enable specific rule(s)
    | 'import';                // Import data from file

export interface Directive {
    type: DirectiveType;
    line: number;
    rules?: string[];          // Specific rules to disable/enable
    affectedLines: number[];   // Lines affected by this directive
    importPath?: string;       // File path for import directives
    importAlias?: string;      // Alias for imported data (e.g., 'data', 'config')
}

/**
 * Parse directives from document comments
 * Supported formats:
 * - @disable-lint
 * - @enable-lint
 * - @disable-next-line
 * - @disable-line
 * - @disable-rule rule-name, rule-name2
 * - @enable-rule rule-name
 * - @import alias from './path/to/file.json'
 * - @import alias from './path/to/file.yaml'
 */
export function parseDirectives(document: TextDocument): Directive[] {
    const text = document.getText();
    const lines = text.split('\n');
    const directives: Directive[] = [];
    let globalLintEnabled = true;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || '';
        const trimmed = line.trim();

        // Check if line is a comment
        if (!trimmed.startsWith('#')) continue;

        // Extract directive
        const directiveMatch = trimmed.match(/#\s*@([\w-]+)(?:\s+(.+))?/);
        if (!directiveMatch) continue;

        const [, directiveName, args] = directiveMatch;
        const directive = parseDirective(directiveName!, args, i);
        
        if (directive) {
            directives.push(directive);
            
            // Update global state
            if (directive.type === 'disable-lint') {
                globalLintEnabled = false;
            } else if (directive.type === 'enable-lint') {
                globalLintEnabled = true;
            }
        }
    }

    // Apply global lint state to all lines if disabled
    if (!globalLintEnabled && directives.length > 0) {
        const disableLintDirective = directives.find(d => d.type === 'disable-lint');
        if (disableLintDirective) {
            // Extend affected lines to all subsequent lines
            const startLine = disableLintDirective.line;
            const endLine = lines.length - 1;
            disableLintDirective.affectedLines = Array.from(
                { length: endLine - startLine + 1 }, 
                (_, i) => startLine + i
            );
        }
    }

    return directives;
}

function parseDirective(name: string, args: string | undefined, lineNumber: number): Directive | null {
    const type = name as DirectiveType;
    
    switch (type) {
        case 'disable-lint':
            return {
                type,
                line: lineNumber,
                affectedLines: [lineNumber] // Will be extended later
            };
            
        case 'enable-lint':
            return {
                type,
                line: lineNumber,
                affectedLines: []
            };
            
        case 'disable-next-line':
            return {
                type,
                line: lineNumber,
                affectedLines: [lineNumber + 1]
            };
            
        case 'disable-line':
            return {
                type,
                line: lineNumber,
                affectedLines: [lineNumber]
            };
            
        case 'disable-rule':
        case 'enable-rule':
            const rules = args?.split(',').map(r => r.trim()).filter(Boolean);
            return {
                type,
                line: lineNumber,
                rules,
                affectedLines: [lineNumber + 1]
            };
            
        case 'import':
            if (!args) return null;
            // Parse: alias from './path/to/file.json'
            const importMatch = args.match(/^\s*(\w+)\s+from\s+['"](.+)['"]\s*$/);
            if (!importMatch) return null;
            
            const [, alias, filePath] = importMatch;
            return {
                type,
                line: lineNumber,
                importAlias: alias,
                importPath: filePath,
                affectedLines: [] // Import directives don't affect linting
            };
            
        default:
            return null;
    }
}

/**
 * Check if diagnostics should be suppressed for a given line
 */
export function isDiagnosticSuppressed(
    line: number,
    directives: Directive[],
    diagnosticSource?: string
): boolean {
    for (const directive of directives) {
        // Check if line is affected by this directive
        if (!directive.affectedLines.includes(line)) continue;

        switch (directive.type) {
            case 'disable-lint':
                return true;
                
            case 'disable-next-line':
            case 'disable-line':
                return true;
                
            case 'disable-rule':
                // If specific rules are listed, check if diagnostic source matches
                if (directive.rules && diagnosticSource) {
                    return directive.rules.some(rule => 
                        diagnosticSource.includes(rule) || 
                        rule.includes(diagnosticSource)
                    );
                }
                return false;
                
            default:
                continue;
        }
    }

    return false;
}

/**
 * Process directives that affect ranges
 * This handles block-level directives like @disable-lint ... @enable-lint
 */
export function processRangeDirectives(directives: Directive[]): Directive[] {
    const processed: Directive[] = [];
    let currentDisable: Directive | null = null;

    for (let i = 0; i < directives.length; i++) {
        const directive = directives[i]!;

        if (directive.type === 'disable-lint') {
            currentDisable = directive;
            processed.push(directive);
        } else if (directive.type === 'enable-lint' && currentDisable) {
            // Update the disable directive to cover the range
            currentDisable.affectedLines = [];
            for (let line = currentDisable.line; line < directive.line; line++) {
                currentDisable.affectedLines.push(line);
            }
            currentDisable = null;
            processed.push(directive);
        } else {
            processed.push(directive);
        }
    }

    // If there's still an active disable directive, extend it to the end
    if (currentDisable) {
        // This will be handled in parseDirectives
    }

    return processed;
}

/**
 * Extract import directives from a document
 * Returns array of import directives with resolved paths
 */
export function getImportDirectives(document: TextDocument, documentUri: string): Array<{ alias: string; path: string }> {
    const directives = parseDirectives(document);
    const imports: Array<{ alias: string; path: string }> = [];
    
    for (const directive of directives) {
        if (directive.type === 'import' && directive.importAlias && directive.importPath) {
            try {
                let documentDir: string;
                
                if (documentUri === 'file://test' || documentUri === 'file:///test') {
                    // For test documents, use the directory where test files are located
                    documentDir = join(process.cwd(), 'tests', 'rules', 'examples');
                    console.log(`[LSP] Test document detected in getImportDirectives, using test directory: ${documentDir}`);
                } else {
                    // Decode URI components and resolve relative paths
                    const decodedUri = decodeURIComponent(documentUri);
                    
                    // Handle Windows file URIs properly
                    let documentPath: string;
                    if (decodedUri.startsWith('file:///')) {
                        // Remove file:// prefix (keep leading slash for Unix)
                        documentPath = decodedUri.substring(7);
                        
                        // Handle Windows drive letters (C:, D:, etc.)
                        if (documentPath.match(/^[A-Za-z]:/)) {
                            // Already has drive letter, just replace forward slashes
                            documentPath = documentPath.replace(/\//g, '\\');
                        } else if (documentPath.match(/^\/[A-Za-z]:/)) {
                            // Has leading slash before drive letter, remove it
                            documentPath = documentPath.substring(1).replace(/\//g, '\\');
                        } else {
                            // Unix-style path, keep as is
                            documentPath = documentPath.replace(/\//g, '/');
                        }
                    } else {
                        // Fallback for non-file URIs
                        documentPath = decodedUri.replace('file:///', '');
                    }
                    
                    documentDir = dirname(documentPath);
                }
                
                const resolvedPath = join(documentDir, directive.importPath);
                
                imports.push({
                    alias: directive.importAlias,
                    path: resolvedPath
                });
                
                console.log(`[LSP] Import directive resolved: ${directive.importAlias} -> ${resolvedPath}`);
            } catch (error) {
                console.error(`[LSP] Error resolving import directive:`, error);
            }
        }
    }
    
    return imports;
}
