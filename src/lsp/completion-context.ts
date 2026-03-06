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
    valuePrefix: string = '',
    line: string = '',
    position: Position | null = null
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

            // If position is available, use textEdit for precise replacement
            if (position && line) {
                // Calculate the replace range
                const colonIndex = line.indexOf(':');
                const valueStartAfterColon = colonIndex + 1;
                const valueStart = valueStartAfterColon + line.substring(valueStartAfterColon).indexOf(valuePrefix);
                const replaceEnd = valueStart + valuePrefix.length;

                return fields.map(field => {
                    // If valuePrefix ends with '.', preserve it and add field name
                    // Otherwise use the old behavior
                    let newText: string;
                    let displayFilter: string;
                    
                    if (valuePrefix.endsWith('.')) {
                        // Preserve the prefix user already typed (e.g., "data.")
                        newText = valuePrefix + field.name;
                        displayFilter = valuePrefix + field.name;
                    } else {
                        newText = field.name;
                        displayFilter = searchPrefix ? `${searchPrefix}.${field.name}` : field.name;
                    }

                    return {
                        label: field.name,
                        kind: field.type === 'object' ? CompletionItemKind.Module : CompletionItemKind.Field,
                        detail: `${field.type}${field.value !== undefined ? ` = ${globalDataContext.getFormattedValue(field.value)}` : ''}`,
                        filterText: displayFilter,
                        insertText: field.name,
                        textEdit: {
                            range: {
                                start: { line: position.line, character: valueStart },
                                end: { line: position.line, character: replaceEnd }
                            },
                            newText: newText
                        }
                    };
                });
            }

            // Fall back to old behavior without textEdit
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
        case 'value': {
            const operatorCompletions = getValueSpecificToOperator(path);
            const fieldBasedCompletions = getValueCompletionsBasedOnField(path);
            const dataPathCompletions = getDataPathCompletions(valuePrefix, line, position);
            return [...operatorCompletions, ...fieldBasedCompletions, ...dataPathCompletions];
        }
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

/**
 * Gets value completions based on the 'field' key in the same map,
 * finding possible values from imported arrays (e.g., list.username)
 */
function getValueCompletionsBasedOnField(path: (Node | Pair)[]): CompletionItem[] {
    const map = path.slice().reverse().find(n => isMap(n)) as YAMLMap;
    if (!map) return [];

    const fieldPair = map.items.find(item => isPair(item) && String((item.key as Scalar).value) === 'field');
    if (!fieldPair || !isScalar(fieldPair.value)) return [];

    const fieldPath = String(fieldPair.value.value); // e.g. "data.username"
    const propertyName = fieldPath.includes('.') ? fieldPath.split('.').pop() : fieldPath;
    
    if (!propertyName) return [];

    const completions: CompletionItem[] = [];
    const addedValues = new Set<string>(); // to avoid duplicates
    
    // Get all imported data
    const allData = globalDataContext.getValue('');
    if (!allData || typeof allData !== 'object') return completions;

    // Search for arrays matching the property name in any imported dataset
    for (const [alias, data] of Object.entries(allData)) {
        if (!data || typeof data !== 'object') continue;
        
        // Helper to find matching property names recursively
        const findValues = (obj: any, currentPath: string = '') => {
            if (!obj || typeof obj !== 'object') return;
            
            for (const [key, val] of Object.entries(obj)) {
                if (key === propertyName && Array.isArray(val)) {
                    // Found an array of possible values!
                    for (const item of val) {
                        const strVal = String(item);
                        if (!addedValues.has(strVal)) {
                            addedValues.add(strVal);
                            
                            // Format insert string properly (quote strings)
                            const isString = typeof item === 'string';
                            const insertText = isString ? `"${item}"` : strVal;
                            
                            const fullPath = currentPath ? `${currentPath}.${key}` : key;
                            completions.push({
                                label: strVal,
                                kind: CompletionItemKind.Value,
                                detail: `Suggested value (${fullPath})`,
                                insertText: insertText
                            });
                        }
                    }
                } else if (typeof val === 'object' && !Array.isArray(val)) {
                    findValues(val, currentPath ? `${currentPath}.${key}` : key);
                }
            }
        };
        
        findValues(data, alias);
    }

    return completions;
}

/**
 * Gets completions for absolute data paths (e.g. "alias.data.names[0]")
 * and inserts their actual value into the document.
 */
function getDataPathCompletions(valuePrefix: string, line: string, position: Position | null): CompletionItem[] {
    const completions: CompletionItem[] = [];
    const allData = globalDataContext.getValue('');
    
    if (!allData || typeof allData !== 'object') return completions;

    // Retrieve the base value prefix typing
    let searchPrefix = valuePrefix;
    // If inside quotes, strip quotes for searching
    if (searchPrefix.startsWith('"') || searchPrefix.startsWith("'")) {
        searchPrefix = searchPrefix.substring(1);
    }
    const prefixLower = searchPrefix.toLowerCase();

    const traverse = (obj: any, currentPath: string) => {
        if (!obj || typeof obj !== 'object') return;
        
        for (const [key, val] of Object.entries(obj)) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            
            if (Array.isArray(val)) {
                val.forEach((item, index) => {
                    const itemPath = `${newPath}[${index}]`;
                    
                    if (typeof item === 'object' && item !== null) {
                        traverse(item, itemPath);
                        return;
                    }
                    
                    // Skip if looking for a specific prefix and it doesn't match
                    if (prefixLower && !itemPath.toLowerCase().includes(prefixLower)) return;

                    const isString = typeof item === 'string';
                    const insertText = isString ? `"${item}"` : String(item);
                    
                    completions.push({
                        label: itemPath,
                        kind: CompletionItemKind.Value,
                        detail: `Value: ${insertText}`,
                        insertText: insertText,
                        filterText: itemPath
                    });
                });
            } else if (typeof val === 'object' && val !== null) {
                traverse(val, newPath);
            } else {
                // Scalar value handling
                if (prefixLower && !newPath.toLowerCase().includes(prefixLower)) continue;

                const isString = typeof val === 'string';
                const insertText = isString ? `"${val}"` : String(val);
                
                completions.push({
                    label: newPath,
                    kind: CompletionItemKind.Value,
                    detail: `Value: ${insertText}`,
                    insertText: insertText,
                    filterText: newPath
                });
            }
        }
    };

    traverse(allData, '');

    if (position && line && valuePrefix) {
        // Compute textEdit range to replace the typed value prefix completely
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const valueStartAfterColon = colonIndex + 1;
            const valueStart = valueStartAfterColon + line.substring(valueStartAfterColon).indexOf(valuePrefix);
            const replaceEnd = valueStart + valuePrefix.length;

            completions.forEach(comp => {
                comp.textEdit = {
                    range: {
                        start: { line: position.line, character: valueStart },
                        end: { line: position.line, character: replaceEnd }
                    },
                    newText: comp.insertText || comp.label
                };
            });
        }
    }

    return completions;
}
