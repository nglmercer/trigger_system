
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
import { getImportDirectives, type DirectiveType } from './directives';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';

// --- CONSTANTS & DEFINITIONS ---

const TOP_LEVEL_KEYS: CompletionItem[] = [
    { label: 'id', kind: CompletionItemKind.Field, detail: 'Unique identifier for the rule' },
    { label: 'name', kind: CompletionItemKind.Field, detail: 'Human readable name' },
    { label: 'description', kind: CompletionItemKind.Field, detail: 'What this rule does' },
    { label: 'on', kind: CompletionItemKind.Keyword, detail: 'The event that triggers this rule' },
    { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditions that must be met' },
    { label: 'do', kind: CompletionItemKind.Keyword, detail: 'Actions to perform when triggered' },
    { label: 'priority', kind: CompletionItemKind.Property, detail: 'Rule execution priority (higher = first)' },
    { label: 'enabled', kind: CompletionItemKind.Property, detail: 'Whether this rule is active' },
    { label: 'cooldown', kind: CompletionItemKind.Property, detail: 'Wait time in ms between executions' },
    { label: 'tags', kind: CompletionItemKind.Property, detail: 'Categorization tags' },
    { label: 'comment', kind: CompletionItemKind.Text, detail: 'Internal developer note' }
];

const EVENTS: CompletionItem[] = [
    { label: 'minecraft:player_join', kind: CompletionItemKind.Event },
    { label: 'minecraft:player_quit', kind: CompletionItemKind.Event },
    { label: 'minecraft:chat', kind: CompletionItemKind.Event },
    { label: 'tiktok:chat', kind: CompletionItemKind.Event },
    { label: 'tiktok:gift', kind: CompletionItemKind.Event },
    { label: 'tiktok:like', kind: CompletionItemKind.Event },
    { label: 'twitch:chat', kind: CompletionItemKind.Event },
    { label: 'twitch:follow', kind: CompletionItemKind.Event },
    { label: 'bopl:webhook', kind: CompletionItemKind.Event },
    { label: 'ANY_EVENT', kind: CompletionItemKind.Event },
    { label: 'USER_LOGIN', kind: CompletionItemKind.Event },
    { label: 'GAME_OVER', kind: CompletionItemKind.Event },
    { label: 'COMMAND', kind: CompletionItemKind.Event },
    { label: 'ALERT', kind: CompletionItemKind.Event }
];

const OPERATORS: CompletionItem[] = [
    { label: 'EQ', kind: CompletionItemKind.Operator, detail: 'Equal (==)' },
    { label: 'NEQ', kind: CompletionItemKind.Operator, detail: 'Not Equal (!=)' },
    { label: 'GT', kind: CompletionItemKind.Operator, detail: 'Greater Than (>)' },
    { label: 'GTE', kind: CompletionItemKind.Operator, detail: 'Greater Than Equals (>=)' },
    { label: 'LT', kind: CompletionItemKind.Operator, detail: 'Less Than (<)' },
    { label: 'LTE', kind: CompletionItemKind.Operator, detail: 'Less Than Equals (<=)' },
    { label: 'IN', kind: CompletionItemKind.Operator, detail: 'Value exists in the provided list' },
    { label: 'NOT_IN', kind: CompletionItemKind.Operator, detail: 'Value does not exist in the list' },
    { label: 'CONTAINS', kind: CompletionItemKind.Operator, detail: 'String contains substring or List contains item' },
    { label: 'MATCHES', kind: CompletionItemKind.Operator, detail: 'Regex pattern match' },
    { label: 'RANGE', kind: CompletionItemKind.Operator, detail: 'Numeric value between [min, max]' },
    { label: 'SINCE', kind: CompletionItemKind.Operator, detail: 'Date is after or equal to value' },
    { label: 'AFTER', kind: CompletionItemKind.Operator, detail: 'Alias for SINCE' },
    { label: 'BEFORE', kind: CompletionItemKind.Operator, detail: 'Date is before value' },
    { label: 'UNTIL', kind: CompletionItemKind.Operator, detail: 'Alias for BEFORE' },
    { label: 'AND', kind: CompletionItemKind.Operator, detail: 'Logical AND (for groups)' },
    { label: 'OR', kind: CompletionItemKind.Operator, detail: 'Logical OR (for groups)' }
];

const ACTION_TYPES: CompletionItem[] = [
    { label: 'log', kind: CompletionItemKind.EnumMember, detail: 'Print message to console' },
    { label: 'math', kind: CompletionItemKind.EnumMember, detail: 'Evaluate mathematical expression' },
    { label: 'execute', kind: CompletionItemKind.EnumMember, detail: 'Run local command' },
    { label: 'forward', kind: CompletionItemKind.EnumMember, detail: 'Forward event to URL' },
    { label: 'response', kind: CompletionItemKind.EnumMember, detail: 'Return HTTP response' },
    { label: 'STATE_SET', kind: CompletionItemKind.EnumMember, detail: 'Save value to global state' },
    { label: 'STATE_INCREMENT', kind: CompletionItemKind.EnumMember, detail: 'Increment numeric state key' },
    { label: 'EMIT_EVENT', kind: CompletionItemKind.EnumMember, detail: 'Trigger another event internally' },
];

const CONDITION_KEYS: CompletionItem[] = [
    { label: 'field', kind: CompletionItemKind.Field, detail: 'Path to context data (e.g. data.user)' },
    { label: 'operator', kind: CompletionItemKind.Field, detail: 'Comparison operator (EQ, GT, etc.)' },
    { label: 'value', kind: CompletionItemKind.Value, detail: 'The value to compare against' },
    { label: 'conditions', kind: CompletionItemKind.Field, detail: 'Sub-conditions for grouping' }
];

const ACTION_KEYS: CompletionItem[] = [
    { label: 'type', kind: CompletionItemKind.Field, detail: 'The type of action to perform' },
    { label: 'params', kind: CompletionItemKind.Variable, detail: 'Configuration for the action' },
    { label: 'delay', kind: CompletionItemKind.Property, detail: 'Delay in ms (integer or expression)' },
    { label: 'probability', kind: CompletionItemKind.Property, detail: 'Execution chance (0-1 or expression)' },
    { label: 'mode', kind: CompletionItemKind.Property, detail: 'Grouping mode (ALL, SEQUENCE, EITHER)' },
    { label: 'actions', kind: CompletionItemKind.Property, detail: 'List of sub-actions' }
];

const PARAM_KEYS: Record<string, CompletionItem[]> = {
    'log': [
        { label: 'message', kind: CompletionItemKind.Property },
        { label: 'content', kind: CompletionItemKind.Property },
        { label: 'level', kind: CompletionItemKind.Property, detail: 'info, warn, error' },
    ],
    'math': [
        { label: 'expression', kind: CompletionItemKind.Property, detail: 'Formula to evaluate (e.g. "1 + 2 * lastResult")' },
    ],
    'execute': [
        { label: 'command', kind: CompletionItemKind.Property },
        { label: 'safe', kind: CompletionItemKind.Property, detail: 'boolean (default: false)' },
        { label: 'dir', kind: CompletionItemKind.Property, detail: 'working directory' },
    ],
    'forward': [
        { label: 'url', kind: CompletionItemKind.Property },
        { label: 'method', kind: CompletionItemKind.Property, detail: 'POST, GET, PUT...' },
        { label: 'headers', kind: CompletionItemKind.Property },
        { label: 'body', kind: CompletionItemKind.Property },
    ],
    'response': [
        { label: 'content', kind: CompletionItemKind.Property },
        { label: 'statusCode', kind: CompletionItemKind.Property, detail: '200, 404, etc.' },
        { label: 'contentType', kind: CompletionItemKind.Property, detail: 'application/json' },
    ],
    'STATE_SET': [
        { label: 'key', kind: CompletionItemKind.Property },
        { label: 'value', kind: CompletionItemKind.Property },
        { label: 'ttl', kind: CompletionItemKind.Property, detail: 'Time to live in ms' },
    ],
    'STATE_INCREMENT': [
        { label: 'key', kind: CompletionItemKind.Property },
        { label: 'amount', kind: CompletionItemKind.Property },
    ],
    'EMIT_EVENT': [
        { label: 'event', kind: CompletionItemKind.Property },
        { label: 'data', kind: CompletionItemKind.Property },
    ]
};


const SNIPPETS: CompletionItem[] = [
    { 
        label: 'trigger_rule', 
        kind: CompletionItemKind.Snippet, 
        insertText: '- id: ${1:rule-id}\n  on: ${2:EVENT}\n  if:\n    field: ${3:data.field}\n    operator: ${4:EQ}\n    value: ${5:target}\n  do:\n    type: ${6:log}\n    params:\n      message: ${7:Done}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'New rule template'
    },
    {
        label: 'log_action',
        kind: CompletionItemKind.Snippet,
        insertText: 'type: log\nparams:\n  message: ${1:message}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Log action template'
    },
    {
        label: 'condition_nested',
        kind: CompletionItemKind.Snippet,
        insertText: 'operator: ${1|AND,OR|}\nconditions:\n  - field: ${2:data.x}\n    operator: ${3:EQ}\n    value: ${4:val}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Nested condition group'
    }
];

// --- MAIN LOGIC ---

export function getCompletionItems(document: TextDocument, position: Position): CompletionItem[] {
    console.log(`[LSP] getCompletionItems called for document: ${document.uri}`);
    console.log(`[LSP] Position: line ${position.line}, character ${position.character}`);
    
    // Load data from import directives only (declarative approach)
    const imports = getImportDirectives(document, document.uri);
    console.log(`[LSP] Found ${imports.length} import directives`);
    
    if (imports.length > 0) {
        console.log(`[LSP] Loading data from imports:`, imports);
        loadDataFromImports(imports);
        // Verificar datos cargados
        const allData = globalDataContext.getValue('');
        console.log(`[LSP] Data loaded in context:`, allData);
        console.log(`[LSP] Available top-level keys:`, allData ? Object.keys(allData) : 'none');
    } else {
        console.log(`[LSP] No imports found, clearing data context`);
        // Clear data context when no imports are defined
        globalDataContext.clear();
    }
    
    const text = document.getText();
    const doc = parseDocument(text);
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const offset = document.offsetAt(position);
    
    console.log(`[LSP] Current line: "${line}"`);
    console.log(`[LSP] Offset: ${offset}`);
    
    // Check if we're in a comment line (for directive completion)
    if (line.trim().startsWith('#')) {
        const directiveCompletions = getDirectiveCompletions(line, position.character, document);
        if (directiveCompletions.length > 0) {
            return directiveCompletions;
        }
    }
    
    // Check if we're inside a template variable ${...}
    const templateMatch = checkTemplateVariable(line, position.character);
    if (templateMatch) {
        return getTemplateVariableCompletions(templateMatch);
    }
    
    // 1. Check if we are in a VALUE position (after colon)
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1 && position.character > colonIndex) {
        const key = line.substring(0, colonIndex).trim().replace(/^- /, '');
        const path = findPathAtOffset(doc.contents, offset) || [];
        return getValueCompletionsByKey(key, path);
    }

    // 2. We are in a KEY position or start of line
    const path = findPathAtOffset(doc.contents, offset) || [];
    const completions = getKeyCompletions(path, line);
    
    console.log(`[LSP] Returning ${completions.length} completion items`);
    if (completions.length > 0) {
        console.log(`[LSP] First few items:`, completions.slice(0, 3).map(c => c.label));
    }
    
    return completions;
}

/**
 * Check if cursor is inside a template variable and return the context
 */
function checkTemplateVariable(line: string, character: number): { prefix: string; inTemplate: boolean } | null {
    console.log(`[LSP] checkTemplateVariable - line: "${line}", character: ${character}`);
    
    // Find all template variable positions in the line
    const regex = /\$\{([^}]*)\}/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        console.log(`[LSP] Found template: "${match[0]}" at positions ${start}-${end}`);
        
        // Check if cursor is inside this template (inclusive of start and end)
        if (character >= start && character <= end) {
            const content = match[1] || '';
            const dotIndex = content.lastIndexOf('.');
            
            console.log(`[LSP] Cursor inside template, content: "${content}", dotIndex: ${dotIndex}`);
            
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
    
    console.log(`[LSP] Checking for incomplete template - lastDollarBrace: ${lastDollarBrace}, lastCloseBrace: ${lastCloseBrace}`);
    
    if (lastDollarBrace > lastCloseBrace) {
        const content = beforeCursor.substring(lastDollarBrace + 2);
        const dotIndex = content.lastIndexOf('.');
        
        console.log(`[LSP] Found incomplete template, content: "${content}", dotIndex: ${dotIndex}`);
        
        return {
            prefix: dotIndex >= 0 ? content.substring(0, dotIndex + 1) : content,
            inTemplate: true
        };
    }
    
    // Check if we're right at the $ or { position and should start a new template
    if (character > 0) {
        const charBefore = line[character - 1];
        if (charBefore === '$' || charBefore === '{') {
            console.log(`[LSP] Found $ or { at position ${character - 1}`);
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
            console.log(`[LSP] Found potential template start at current position`);
            return {
                prefix: '',
                inTemplate: true
            };
        }
    }
    
    console.log(`[LSP] No template found`);
    return null;
}

/**
 * Get completions for template variables
 */
function getTemplateVariableCompletions(context: { prefix: string; inTemplate: boolean }): CompletionItem[] {
    const prefix = context.prefix.trim();
    console.log(`[LSP] Template variable completion - prefix: "${prefix}"`);
    
    // Handle different variable types based on what's loaded in globalDataContext
    const allData = globalDataContext.getValue('');
    console.log(`[LSP] Current data context:`, allData);
    
    if (!allData || typeof allData !== 'object') {
        console.log(`[LSP] No data available in context`);
        return [{
            label: 'data',
            kind: CompletionItemKind.Variable,
            detail: 'No imported data available',
            documentation: 'Add a data import directive like: # @import data from ./data.json'
        }];
    }
    
    // Check if we're at the root level (after ${ or ${data. etc)
    const cleanPrefix = prefix.replace('${', '').replace(/\.$/, '');
    console.log(`[LSP] Clean prefix: "${cleanPrefix}"`);
    
    // If we're at root level, suggest all available top-level variables (aliases)
    if (!cleanPrefix || cleanPrefix === '') {
        const suggestions: CompletionItem[] = [
            { label: 'lastResult', kind: CompletionItemKind.Variable, detail: 'Result of the previous action (SEQUENCE mode)' },
            { label: 'state', kind: CompletionItemKind.Variable, detail: 'Global engine state' },
            { label: 'globals', kind: CompletionItemKind.Variable, detail: 'Global variables' },
            { label: 'data', kind: CompletionItemKind.Variable, detail: 'Event data' },
            { label: 'helpers', kind: CompletionItemKind.Variable, detail: 'Context helpers/functions' },
            { label: 'Math', kind: CompletionItemKind.Variable, detail: 'Mathematical functions (round, floor, etc.)' }
        ];

        // Add imported data keys
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
        console.log(`[LSP] Root level suggestions:`, suggestions.map(s => s.label));
        return suggestions;
    }
    
    // If we have a specific prefix, get fields from that path
    // The prefix might be something like "data" or "data.server" or "config.username"
    const fields = globalDataContext.getFields(cleanPrefix);
    console.log(`[LSP] Fields for prefix "${cleanPrefix}":`, fields.map(f => f.name));
    
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
                insertText: field.name
            };
        });
        console.log(`[LSP] Field suggestions:`, suggestions.map(s => s.label));
        return suggestions;
    }
    
    // If no fields found, suggest similar paths or provide helpful message
    console.log(`[LSP] No suggestions found for prefix "${prefix}"`);
    
    // Check if we have any data at all to provide suggestions
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

function getValueCompletionsByKey(key: string, path: (Node | Pair)[]): CompletionItem[] {
    switch (key) {
        case 'on': return EVENTS;
        case 'operator': return OPERATORS;
        case 'type': return ACTION_TYPES;
        case 'mode':
            return [
                { label: 'ALL', kind: CompletionItemKind.EnumMember, detail: 'Execute all' },
                { label: 'SEQUENCE', kind: CompletionItemKind.EnumMember, detail: 'Wait for each' },
                { label: 'EITHER', kind: CompletionItemKind.EnumMember, detail: 'Random choice' }
            ];
        case 'enabled':
            return [
                { label: 'true', kind: CompletionItemKind.Value },
                { label: 'false', kind: CompletionItemKind.Value }
            ];
        case 'field':
            // Only suggest imported data fields
            const fields = globalDataContext.getFields('data');
            return fields.map(field => ({
                label: field.name,
                kind: CompletionItemKind.Field,
                detail: `${field.type}${field.value !== undefined ? ` = ${globalDataContext.getFormattedValue(field.value)}` : ''}`
            }));
        case 'value':
            return getValueSpecificToOperator(path);
    }
    // Return empty array instead of DYNAMIC_VALUES
    return [];
}

function getKeyCompletions(path: (Node | Pair)[], line: string): CompletionItem[] {
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


// --- HELPERS ---

function isKeyOfParent(node: Scalar, path: (Node | Pair)[]): boolean {
    const parent = path[path.length - 2];
    if (isPair(parent)) return parent.key === node;
    return false;
}

function findEffectiveParentPair(path: (Node | Pair)[]): Pair | null {
    for (let i = path.length - 1; i >= 0; i--) {
        const item = path[i];
        if (isPair(item)) return item;
    }
    return null;
}

function findNearestActionMap(path: (Node | Pair)[]): YAMLMap | null {
    for (let i = path.length - 1; i >= 0; i--) {
        const item = path[i];
        if (isMap(item)) {
            const hasType = item.items.some(p => isPair(p) && String((p.key as Scalar).value) === 'type');
            if (hasType) return item;
        }
    }
    return null;
}

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

export function findPathAtOffset(node: Node | Pair | null, offset: number, currentPath: (Node | Pair)[] = []): (Node | Pair)[] | null {
    if (!node) return null;
    
    // Check range
    const range = (node as Node).range;
    if (range) {
        // [start, end, optional_something]
        // Parser range is [start, end]. 
        // We want to be inclusive and a bit more for completions at the end of a line.
        if (offset < range[0] || offset > range[1] + 1) {
             // If we are exactly 1 char past the end (like at the end of "mode: "), 
             // we still might want this node if it's the most specific one.
        }
    }

    const newPath = [...currentPath, node];

    if (isMap(node)) {
        for (const item of node.items) {
            if (isPair(item)) {
                // Check if the pair's key or value contains the offset
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
        // If we are in a pair, we could be in key or value
        const keyRange = (node.key as Node)?.range;
        if (keyRange && offset >= keyRange[0] && offset <= keyRange[1] + 1) {
            return findPathAtOffset(node.key as Node, offset, newPath);
        }
        
        // If there's a value, check it
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

/**
* Get completions for directive comments (lines starting with #)
*/
function getDirectiveCompletions(line: string, character: number, document: TextDocument): CompletionItem[] {
console.log(`[LSP] Checking directive completions for line: "${line}" at character ${character}`);

// Check if we're in a directive context
const directiveMatch = line.match(/#\s*@?([\w-]*)$/);
if (!directiveMatch) return [];

const partialDirective = directiveMatch[1] || '';
console.log(`[LSP] Partial directive: "${partialDirective}"`);

// Check if we're in an import directive and need file path completion
if (partialDirective.startsWith('import') || line.includes('@import')) {
    const importMatch = line.match(/@import\s+\w+\s+from\s+['"]?([^'"]*)$/);
    if (importMatch) {
        const partialPath = importMatch[1] || '';
        return getImportFileCompletions(document.uri, partialPath);
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
 * Get all available directive completions with enhanced categorization and colors
 */
function getAllDirectiveCompletions(): CompletionItem[] {
const directives: CompletionItem[] = [
    // Import directives (Macro category - distinctive color)
    {
        label: 'import',
        kind: CompletionItemKind.Function, // Function type for imports
        detail: 'Import data from JSON/YAML file',
        insertText: 'import ${1:alias} from ${2:./path/to/file.json}',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Imports data from a JSON or YAML file for use in autocompletion and validation. Example: @import data from ./data.json',
        data: { category: 'import', color: 'macro' }
    },
    
    // Global lint control (Namespace category)
    {
        label: 'disable-lint',
        kind: CompletionItemKind.Module, // Module type for global controls
        detail: 'Disable all linting for subsequent lines',
        insertText: 'disable-lint',
        documentation: 'Disables all linting and validation for the rest of the document or until @enable-lint is encountered',
        data: { category: 'global-control', color: 'namespace' }
    },
    {
        label: 'enable-lint',
        kind: CompletionItemKind.Module, // Module type for global controls
        detail: 'Enable all linting (default state)',
        insertText: 'enable-lint',
        documentation: 'Enables linting and validation (this is the default state)',
        data: { category: 'global-control', color: 'namespace' }
    },
    
    // Line-specific control (EnumMember category)
    {
        label: 'disable-next-line',
        kind: CompletionItemKind.EnumMember, // EnumMember for line-specific
        detail: 'Disable lint for the next line only',
        insertText: 'disable-next-line',
        documentation: 'Disables linting and validation for the next line only',
        data: { category: 'line-control', color: 'enumMember' }
    },
    {
        label: 'disable-line',
        kind: CompletionItemKind.EnumMember, // EnumMember for line-specific
        detail: 'Disable lint for current line',
        insertText: 'disable-line',
        documentation: 'Disables linting and validation for the current line',
        data: { category: 'line-control', color: 'enumMember' }
    },
    
    // Rule-specific control (Type category)
    {
        label: 'disable-rule',
        kind: CompletionItemKind.TypeParameter, // TypeParameter for rule-specific
        detail: 'Disable specific rule(s)',
        insertText: 'disable-rule ${1:rule-name}',
        insertTextFormat: InsertTextFormat.Snippet,
        documentation: 'Disables specific validation rules. Example: @disable-rule missing-id, invalid-operator',
        data: { category: 'rule-control', color: 'type' }
    },
    {
        label: 'enable-rule',
        kind: CompletionItemKind.TypeParameter, // TypeParameter for rule-specific
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
function getImportFileCompletions(documentPath: string, partialPath: string): CompletionItem[] {
const completions: CompletionItem[] = [];

try {
    const decodedUri = decodeURIComponent(documentPath);
    const documentDir = dirname(decodedUri.replace('file:///', '').replace(/^\/([A-Z]:)/, '$1'));
    const currentDir = partialPath.includes('/') ? dirname(join(documentDir, partialPath)) : documentDir;
    
    // Get list of JSON and YAML files in the directory
    const fs = require('fs');
    if (existsSync(currentDir)) {
        const files = fs.readdirSync(currentDir);
        const validExtensions = ['.json', '.yaml', '.yml'];
        
        files.forEach((file: string) => {
            const ext = extname(file).toLowerCase();
            if (validExtensions.includes(ext)) {
                const relativePath = './' + (partialPath.includes('/') ?
                    dirname(partialPath) + '/' + file : file);
                
                completions.push({
                    label: relativePath,
                    kind: CompletionItemKind.File,
                    detail: `${ext.toUpperCase()} data file`,
                    insertText: `"${relativePath}"`
                });
            }
        });
    }
} catch (error) {
    console.log(`[LSP] Error getting file completions:`, error);
}

return completions;
}
