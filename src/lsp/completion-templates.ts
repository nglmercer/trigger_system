// src/lsp/completion-templates.ts
/**
 * Template variable completions for LSP
 * Handles ${...} variable interpolation completions
 */

import {
    CompletionItemKind,
} from 'vscode-languageserver/node';
import type {
    CompletionItem,
} from 'vscode-languageserver/node';
import { globalDataContext } from './data-context';

/**
 * Check if cursor is inside a template variable and return the context
 */
export function checkTemplateVariable(line: string, character: number): { prefix: string; inTemplate: boolean } | null {
    // Find all template variable positions in the line
    const regex = /\$\{([^}]*)\}/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        if (character >= start && character <= end) {
            const content = match[1] || '';
            const dotIndex = content.lastIndexOf('.');
            return {
                prefix: dotIndex >= 0 ? content.substring(0, dotIndex + 1) : content,
                inTemplate: true
            };
        }
    }

    // Check if we're typing after ${
    const beforeCursor = line.substring(0, character);
    const lastDollarBrace = beforeCursor.lastIndexOf('${');
    const lastCloseBrace = beforeCursor.lastIndexOf('}');

    if (lastDollarBrace > lastCloseBrace) {
        const content = beforeCursor.substring(lastDollarBrace + 2);
        const dotIndex = content.lastIndexOf('.');
        return {
            prefix: dotIndex >= 0 ? content.substring(0, dotIndex + 1) : content,
            inTemplate: true
        };
    }

    // Check if we're right at the $ or { position
    if (character > 0) {
        const charBefore = line[character - 1];
        if (charBefore === '$' || charBefore === '{') {
            return {
                prefix: '',
                inTemplate: true
            };
        }
    }

    // Special check: if we're at the very beginning of a potential template
    if (character < line.length) {
        const remaining = line.substring(character);
        if (remaining.startsWith('${') || remaining.startsWith('{')) {
            return {
                prefix: '',
                inTemplate: true
            };
        }
    }

    return null;
}

/**
 * Get completions for built-in variables (vars, env, etc.)
 */
export function getBuiltInVariableCompletions(prefix: string): CompletionItem[] {
    const suggestions: CompletionItem[] = [];

    const builtIns = [
        { name: 'vars', detail: 'Global variables (configuration)', type: 'object' },
        { name: 'env', detail: 'Dynamic variables set by actions', type: 'object' },
    ];

    builtIns.forEach(bi => {
        if (bi.name.startsWith(prefix)) {
            suggestions.push({
                label: bi.name,
                kind: CompletionItemKind.Variable,
                detail: `${bi.type} - ${bi.detail}`
            });
        }
    });

    return suggestions;
}

/**
 * Get completions for template variables
 */
export function getTemplateVariableCompletions(context: { prefix: string; inTemplate: boolean }): CompletionItem[] {
    const prefix = context.prefix.trim();

    const allData = globalDataContext.getValue('');

    if (!allData || typeof allData !== 'object') {
        return [{
            label: 'data',
            kind: CompletionItemKind.Variable,
            detail: 'No imported data available',
            documentation: 'Add a data import directive like: # @import data from ./data.json'
        }];
    }

    const cleanPrefix = prefix.replace('${', '').replace(/\.$/, '');

    // If we're at root level, suggest all available top-level variables
    if (!cleanPrefix || cleanPrefix === '') {
        const suggestions: CompletionItem[] = [
            { label: 'vars', kind: CompletionItemKind.Variable, detail: 'Global variables' },
            { label: 'env', kind: CompletionItemKind.Variable, detail: 'Dynamic variables' },
            { label: 'data', kind: CompletionItemKind.Variable, detail: 'Event data' },
            { label: 'Math', kind: CompletionItemKind.Variable, detail: 'Mathematical functions (round, floor, etc.)' }
        ];

        if (allData && typeof allData === 'object') {
            Object.keys(allData).forEach(key => {
                const value = allData[key];
                const valueType = Array.isArray(value) ? 'array' : typeof value;
                const sampleValue = valueType === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value);

                suggestions.push({
                    label: key,
                    kind: CompletionItemKind.Variable,
                    detail: `${valueType} (imported data)`,
                    documentation: `Sample value: ${sampleValue}`,
                    insertText: key
                });
            });
        }
        return suggestions;
    }

    // If we have a specific prefix, get fields from that path
    const fields = globalDataContext.getFields(cleanPrefix);

    // If no fields found in imported data, check for built-in variables
    if (fields.length === 0) {
        const builtInVars = getBuiltInVariableCompletions(cleanPrefix);
        if (builtInVars.length > 0) {
            return builtInVars;
        }
    }

    if (fields.length > 0) {
        const suggestions = fields.map(field => {
            const sampleValue = field.type === 'object' ?
                JSON.stringify(field.value).substring(0, 50) + '...' :
                globalDataContext.getFormattedValue(field.value);

            return {
                label: field.name,
                kind: field.type === 'object' ? CompletionItemKind.Module : CompletionItemKind.Field,
                detail: `${field.type} (imported data)`,
                documentation: `Sample value: ${sampleValue}`,
                filterText: cleanPrefix ? `${cleanPrefix}.${field.name}` : field.name,
                insertText: cleanPrefix ? `${cleanPrefix}.${field.name}` : field.name
            };
        });
        return suggestions;
    }

    // If no fields found, suggest similar paths or provide helpful message
    const allKeys = Object.keys(allData);
    if (allKeys.length > 0) {
        return [{
            label: cleanPrefix,
            kind: CompletionItemKind.Text,
            detail: 'Path not found in imported data',
            documentation: `Available top-level keys: ${allKeys.join(', ')}`,
            insertText: cleanPrefix
        }];
    }

    return [];
}
