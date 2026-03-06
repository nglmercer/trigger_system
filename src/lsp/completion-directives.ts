// src/lsp/completion-directives.ts
/**
 * Directive completions for LSP
 * Handles @import, @disable-lint, @enable-lint, etc.
 */

import {
    CompletionItemKind,
    InsertTextFormat
} from 'vscode-languageserver/node';
import type {
    CompletionItem,
    TextDocument,
    Position
} from 'vscode-languageserver/node';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';

/**
 * Get completions for directive comments (lines starting with #)
 */
export function getDirectiveCompletions(
    line: string, 
    character: number, 
    document: TextDocument
): CompletionItem[] {
    // Check if we're in a directive context
    const directiveMatch = line.match(/#\s*@?([\w-]*)$/);
    if (!directiveMatch) {
        // Check for import specific context (mid-typing)
        if (line.includes('@import')) {
            const importMatch = line.match(/@import\s+\w+\s+from\s+(['"]?)([^'"]*)$/);
            if (importMatch) {
                const quoteChar = importMatch[1] || '';
                const partialPath = importMatch[2] || '';
                return getImportFileCompletions(document.uri, partialPath, quoteChar);
            }
        }
        return [];
    }

    const partialDirective = directiveMatch[1] || '';

    // Check if we're in an import directive and need file path completion
    if (partialDirective.startsWith('import') || line.includes('@import')) {
        const importMatch = line.match(/@import\s+\w+\s+from\s+(['"]?)([^'"]*)$/);
        if (importMatch) {
            const quoteChar = importMatch[1] || '';
            const partialPath = importMatch[2] || '';
            return getImportFileCompletions(document.uri, partialPath, quoteChar);
        }
    }

    // If we're just starting a directive (after # or @)
    if (partialDirective === '' || line.match(/#\s*$/)) {
        return getAllDirectiveCompletions();
    }

    // If we have a partial directive, filter completions
    const allDirectives = getAllDirectiveCompletions();
    return allDirectives.filter(item =>
        item.label.toLowerCase().startsWith(partialDirective.toLowerCase())
    );
}

/**
 * Get all available directive completions
 */
export function getAllDirectiveCompletions(): CompletionItem[] {
    const directives: CompletionItem[] = [
        // Import directives
        {
            label: 'import',
            kind: CompletionItemKind.Function,
            detail: 'Import data from JSON/YAML file',
            insertText: 'import ${1:alias} from "${2:./path/to/file.json}"',
            insertTextFormat: InsertTextFormat.Snippet,
            documentation: 'Imports data from a JSON or YAML file for use in autocompletion and validation. Example: @import data from "./data.json"',
            data: { category: 'import', color: 'macro' }
        },
        // Global lint control
        {
            label: 'disable-lint',
            kind: CompletionItemKind.Module,
            detail: 'Disable all linting for subsequent lines',
            insertText: 'disable-lint',
            documentation: 'Disables all linting and validation for the rest of the document or until @enable-lint is encountered',
            data: { category: 'global-control', color: 'namespace' }
        },
        {
            label: 'enable-lint',
            kind: CompletionItemKind.Module,
            detail: 'Enable all linting (default state)',
            insertText: 'enable-lint',
            documentation: 'Enables linting and validation (this is the default state)',
            data: { category: 'global-control', color: 'namespace' }
        },
        // Line-specific control
        {
            label: 'disable-next-line',
            kind: CompletionItemKind.EnumMember,
            detail: 'Disable lint for the next line only',
            insertText: 'disable-next-line',
            documentation: 'Disables linting and validation for the next line only',
            data: { category: 'line-control', color: 'enumMember' }
        },
        {
            label: 'disable-line',
            kind: CompletionItemKind.EnumMember,
            detail: 'Disable lint for current line',
            insertText: 'disable-line',
            documentation: 'Disables linting and validation for the current line',
            data: { category: 'line-control', color: 'enumMember' }
        },
        // Rule-specific control
        {
            label: 'disable-rule',
            kind: CompletionItemKind.TypeParameter,
            detail: 'Disable specific rule(s)',
            insertText: 'disable-rule ${1:rule-name}',
            insertTextFormat: InsertTextFormat.Snippet,
            documentation: 'Disables specific validation rules. Example: @disable-rule missing-id, invalid-operator',
            data: { category: 'rule-control', color: 'type' }
        },
        {
            label: 'enable-rule',
            kind: CompletionItemKind.TypeParameter,
            detail: 'Enable specific rule(s)',
            insertText: 'enable-rule ${1:rule-name}',
            insertTextFormat: InsertTextFormat.Snippet,
            documentation: 'Enables specific validation rules that were previously disabled',
            data: { category: 'rule-control', color: 'type' }
        }
    ];

    return directives;
}

/**
 * Get file path completions for import directives
 */
export function getImportFileCompletions(
    documentPath: string, 
    partialPath: string, 
    quoteChar: string
): CompletionItem[] {
    const completions: CompletionItem[] = [];

    try {
        const decodedUri = decodeURIComponent(documentPath);
        let resolvedPath = decodedUri;
        if (decodedUri.startsWith('file:///')) {
            const path = decodedUri.substring(7);
            // Handle Windows drive letters
            if (path.match(/^\/[A-Za-z]:/)) {
                resolvedPath = path.substring(1);
            } else {
                resolvedPath = path;
            }
        }
        const documentDir = dirname(resolvedPath);

        let searchDir = documentDir;
        let prefix = partialPath;

        const lastSlashIndex = partialPath.lastIndexOf('/');
        if (lastSlashIndex !== -1) {
            const dirPart = partialPath.substring(0, lastSlashIndex);
            searchDir = join(documentDir, dirPart);
        } else if (partialPath === '.' || partialPath === '..') {
            // Special handling for . and ..
        }

        const fs = require('fs');
        if (existsSync(searchDir) && fs.statSync(searchDir).isDirectory()) {
            const entries = fs.readdirSync(searchDir, { withFileTypes: true });
            const validExtensions = ['.json', '.yaml', '.yml'];

            entries.forEach((entry: Record<string, any>) => {
                const name = entry.name;
                const isDir = entry.isDirectory();

                if (isDir || validExtensions.includes(extname(name).toLowerCase())) {
                    let relativePath: string;

                    if (lastSlashIndex !== -1) {
                        const dirPart = partialPath.substring(0, lastSlashIndex + 1);
                        relativePath = dirPart + name;
                    } else {
                        if (partialPath.startsWith('./')) {
                            relativePath = './' + name;
                        } else {
                            relativePath = name;
                            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
                        }
                    }

                    if (isDir) {
                        relativePath += '/';
                    }

                    completions.push({
                        label: isDir ? name + '/' : name,
                        kind: isDir ? CompletionItemKind.Folder : CompletionItemKind.File,
                        detail: isDir ? 'Directory' : `${extname(name).toUpperCase().substring(1)} File`,
                        insertText: quoteChar ? relativePath : `"${relativePath}"`,
                        sortText: isDir ? '0_' + name : '1_' + name
                    });
                }
            });
        }
    } catch (error) {
        console.log(`[LSP] Error getting file completions:`, error);
    }

    return completions;
}
