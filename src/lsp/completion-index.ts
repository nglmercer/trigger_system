// src/lsp/completion-index.ts
/**
 * LSP Completion Module
 * Main entry point that orchestrates all completion providers
 */

import {
    CompletionItemKind,
    InsertTextFormat
} from 'vscode-languageserver/node';
import type {
    CompletionItem,
    Position
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument, isMap, isSeq, isPair, isScalar, type Node, Scalar, YAMLMap, Pair, YAMLSeq } from 'yaml';
import { globalDataContext, loadDataFromImports } from './data-context';
import { getImportDirectives } from './directives';

// Re-export all constants and helpers
export {
    TOP_LEVEL_KEYS,
    EVENTS,
    OPERATORS,
    ACTION_TYPES,
    CONDITION_KEYS,
    ACTION_KEYS,
    PARAM_KEYS,
    SNIPPETS,
    EXECUTION_MODES,
    BOOLEAN_VALUES
} from './completion-constants';

export {
    findPathAtOffset,
    findEffectiveParentPair,
    findNearestActionMap,
    getPathAtPosition
} from './completion-helpers';

export {
    getDirectiveCompletions,
    getAllDirectiveCompletions,
    getImportFileCompletions
} from './completion-directives';

export {
    checkTemplateVariable,
    getBuiltInVariableCompletions,
    getTemplateVariableCompletions
} from './completion-templates';

export {
    getValueCompletionsByKey,
    getKeyCompletions
} from './completion-context';

// Re-export types
export type { CompletionItem, Position, TextDocument };

// Cache to avoid reloading imports on every keystroke if nothing changed
let lastLoadedUri = '';
let lastImportsHash = '';

/**
 * Main completion function - orchestrates all completion providers
 */
export function getCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    const uri = document.uri;

    // Load data from import directives only (declarative approach)
    const imports = getImportDirectives(document, uri);
    const importsHash = JSON.stringify(imports);

    // Only reload if imports have changed OR we switched files
    if (uri !== lastLoadedUri || importsHash !== lastImportsHash) {
        if (imports.length > 0) {
            loadDataFromImports(imports);
        } else {
            // Clear data context when no imports are defined
            globalDataContext.clear();
        }
        lastLoadedUri = uri;
        lastImportsHash = importsHash;
    }

    const text = document.getText();
    const doc = parseDocument(text);
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const offset = document.offsetAt(position);

    // Check if we're in a comment line (for directive completion)
    if (line.trim().startsWith('#')) {
        // Import directive completions dynamically to avoid circular dependencies
        const { getDirectiveCompletions } = require('./completion-directives');
        const directiveCompletions = getDirectiveCompletions(line, position.character, document);
        if (directiveCompletions.length > 0) {
            return directiveCompletions;
        }
    }

    // Check if we're inside a template variable ${...}
    const { checkTemplateVariable, getTemplateVariableCompletions } = require('./completion-templates');
    const templateMatch = checkTemplateVariable(line, position.character);
    if (templateMatch) {
        return getTemplateVariableCompletions(templateMatch);
    }

    // 1. Check if we are in a VALUE position (after colon)
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1 && position.character > colonIndex) {
        const key = line.substring(0, colonIndex).trim().replace(/^- /, '');
        // Extract the value part typed so far
        const valuePrefix = line.substring(colonIndex + 1, position.character).trim();
        const path = findPathAtOffset(doc.contents, offset) || [];
        
        // Import context completions dynamically
        const { getValueCompletionsByKey } = require('./completion-context');
        return getValueCompletionsByKey(key, path, valuePrefix, line, position);
    }

    // 2. We are in a KEY position or start of line
    const path = findPathAtOffset(doc.contents, offset) || [];
    
    // Import context completions dynamically
    const { getKeyCompletions } = require('./completion-context');
    const completions = getKeyCompletions(path, line);

    return completions;
}

/**
 * Find the path of nodes at a given offset in the YAML document
 */
function findPathAtOffset(node: Node | Pair | null, offset: number, currentPath: (Node | Pair)[] = []): (Node | Pair)[] | null {
    if (!node) return null;

    const newPath = [...currentPath, node];

    if (isMap(node)) {
        for (const item of node.items) {
            if (isPair(item)) {
                const pair = item as Pair;
                if (pair.key && typeof pair.key === 'object' && 'range' in pair.key) {
                    const keyNode = pair.key as Node;
                    if (keyNode.range && offset >= keyNode.range[0] && offset <= keyNode.range[1] + 1) {
                        return findPathAtOffset(item, offset, newPath);
                    }
                }
                if (pair.value && typeof pair.value === 'object' && 'range' in pair.value) {
                    const valueNode = pair.value as Node;
                    if (valueNode.range && offset >= valueNode.range[0] && offset <= valueNode.range[1] + 1) {
                        return findPathAtOffset(item, offset, newPath);
                    }
                }
            }
        }
        return newPath;
    }

    if (isSeq(node)) {
        for (const item of node.items) {
            const itemRange = (item as Node).range;
            if (itemRange && offset >= itemRange[0] && offset <= itemRange[1] + 1) {
                return findPathAtOffset(item as Node, offset, newPath);
            }
        }
        return newPath;
    }

    if (isPair(node)) {
        const keyRange = (node.key as Node)?.range;
        if (keyRange && offset >= keyRange[0] && offset <= keyRange[1] + 1) {
            return findPathAtOffset(node.key as Node, offset, newPath);
        }

        if (node.value) {
            const valRange = (node.value as Node)?.range;
            if (valRange && offset >= valRange[0] && offset <= valRange[1] + 1) {
                return findPathAtOffset(node.value as Node, offset, newPath);
            }
        }

        return newPath;
    }
    return newPath;
}
