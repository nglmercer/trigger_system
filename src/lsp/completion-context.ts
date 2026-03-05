// src/lsp/completion-context.ts
/**
 * Context-aware completion logic
 * Determines what completions to provide based on current position in YAML
 */

import {
    CompletionItemKind,
    InsertTextFormat
} from 'vscode-languageserver/node';
import type {
    CompletionItem,
    Position,
    TextDocument
} from 'vscode-languageserver/node';
import { isMap, isPair, isScalar, type Node, Scalar, YAMLMap, Pair } from 'yaml';

import { 
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
import { 
    findEffectiveParentPair, 
    findNearestActionMap,
    getPathAtPosition
} from './completion-helpers';
import { globalDataContext } from './data-context';

/**
 * Get completions based on key name and current path
 */
export function getValueCompletionsByKey(
    key: string, 
    path: (Node | Pair)[], 
    valuePrefix: string = ''
): CompletionItem[] {
    switch (key) {
        case 'on': 
            return EVENTS;
        case 'operator': 
            return OPERATORS;
        case 'type': 
            return ACTION_TYPES;
        case 'mode':
            return EXECUTION_MODES;
        case 'enabled':
            return BOOLEAN_VALUES;
        case 'field': {
            // Suggest imported data fields based on prefix
            let searchPrefix = '';
            if (valuePrefix.includes('.')) {
                if (valuePrefix.endsWith('.')) {
                    searchPrefix = valuePrefix.substring(0, valuePrefix.length - 1);
                } else {
                    searchPrefix = valuePrefix.substring(0, valuePrefix.lastIndexOf('.'));
                }
            } else if (valuePrefix !== '') {
                searchPrefix = '';
            }

            const fields = globalDataContext.getFields(searchPrefix);

            return fields.map(field => {
                return {
                    label: field.name,
                    kind: field.type === 'object' ? CompletionItemKind.Module : CompletionItemKind.Field,
                    detail: `${field.type}${field.value !== undefined ? ` = ${globalDataContext.getFormattedValue(field.value)}` : ''}`,
                    filterText: searchPrefix ? `${searchPrefix}.${field.name}` : field.name,
                    insertText: searchPrefix ? `${searchPrefix}.${field.name}` : field.name
                };
            });
        }
        case 'value':
            return getValueSpecificToOperator(path);
    }
    return [];
}

/**
 * Get completions based on key (at key position)
 */
export function getKeyCompletions(path: (Node | Pair)[], line: string): CompletionItem[] {
    // If line starts with '- ', we might be in a list
    if (line.trim().startsWith('-')) {
        const parentPair = findEffectiveParentPair(path);
        if (parentPair) {
            const pk = String((parentPair.key as Scalar).value);
            if (pk === 'do' || pk === 'actions') return ACTION_KEYS;
            if (pk === 'if' || pk === 'conditions') return CONDITION_KEYS;
        }
        return SNIPPETS.length > 0 ? [SNIPPETS[0] as CompletionItem] : [];
    }

    const contextPair = findEffectiveParentPair(path);
    if (!contextPair) return TOP_LEVEL_KEYS;

    const key = String((contextPair.key as Scalar).value);
    if (key === 'if' || key === 'conditions') return CONDITION_KEYS;
    if (key === 'do' || key === 'actions') return ACTION_KEYS;

    if (key === 'params') {
        const actionMap = findNearestActionMap(path);
        if (actionMap) {
            const typePair = actionMap.items.find(item => isPair(item) && String((item.key as Scalar).value) === 'type');
            if (typePair && isScalar(typePair.value)) {
                return PARAM_KEYS[String(typePair.value.value)] || [];
            }
        }
    }

    return TOP_LEVEL_KEYS;
}

/**
 * Get value completions specific to the operator
 */
function getValueSpecificToOperator(path: (Node | Pair)[]): CompletionItem[] {
    // Look for a map in the path that contains an 'operator' key
    const map = path.slice().reverse().find(n => isMap(n)) as YAMLMap;
    if (!map) return [];

    const opPair = map.items.find(item => isPair(item) && String((item.key as Scalar).value) === 'operator');
    if (!opPair || !isScalar(opPair.value)) return [];

    const op = String(opPair.value.value);
    switch (op) {
        case 'RANGE':
            return [{ label: '[min, max]', kind: CompletionItemKind.Snippet, insertText: '[$1, $2]', insertTextFormat: InsertTextFormat.Snippet }];
        case 'IN':
        case 'NOT_IN':
            return [{ label: '[item1, item2]', kind: CompletionItemKind.Snippet, insertText: '[$1, $2]', insertTextFormat: InsertTextFormat.Snippet }];
        case 'MATCHES':
            return [{ label: '"regex"', kind: CompletionItemKind.Snippet, insertText: '"^$1$"', insertTextFormat: InsertTextFormat.Snippet }];
    }

    return [];
}
