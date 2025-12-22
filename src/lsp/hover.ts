import type { Hover, MarkupContent, Position } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument, isMap, isScalar, isPair, type Node, type Pair } from 'yaml';
import { globalDataContext, loadDataFromImports } from './data-context';
import { getImportDirectives } from './directives';

/**
 * Field documentation with descriptions and allowed values
 */
const FIELD_DOCS: Record<string, { description: string; values?: string; examples?: string[] }> = {
    id: {
        description: 'Unique identifier for this rule',
        examples: ['my-rule-1', 'donation-handler', 'user-login-tracker']
    },
    name: {
        description: 'Human-readable name for the rule',
        examples: ['Donation Handler', 'User Login Tracker']
    },
    description: {
        description: 'Detailed description of what this rule does',
    },
    on: {
        description: 'The event name that triggers this rule',
        values: 'String event name (e.g., `Donation`, `UserLogin`, `minecraft:player_join`)',
        examples: ['Donation', 'UserLogin', 'minecraft:player_join', 'COMMAND']
    },
    if: {
        description: 'Condition(s) that must be met for the rule to execute',
        values: 'Single condition object, array of conditions, or condition group with AND/OR operator'
    },
    do: {
        description: 'Action(s) to execute when conditions are met',
        values: 'Single action object, array of actions, or action group with mode (ALL, SEQUENCE, EITHER)'
    },
    priority: {
        description: 'Execution priority (higher values execute first)',
        values: 'Integer number',
        examples: ['1', '10', '100']
    },
    enabled: {
        description: 'Whether this rule is active',
        values: 'Boolean: `true` or `false`',
        examples: ['true', 'false']
    },
    cooldown: {
        description: 'Minimum time in milliseconds between executions',
        values: 'Non-negative integer (milliseconds)',
        examples: ['1000', '5000', '60000']
    },
    tags: {
        description: 'Tags for categorizing and organizing rules',
        values: 'Array of strings',
        examples: ['["gameplay", "monetization"]', '["debug", "test"]']
    },
    comment: {
        description: 'Internal developer note (not used in execution)',
    },
};

const OPERATOR_DOCS: Record<string, { description: string; valueType: string; examples?: string[] }> = {
    EQ: {
        description: 'Equal to (==)',
        valueType: 'Any value',
        examples: ['value: 100', 'value: "hello"', 'value: true']
    },
    '==': {
        description: 'Equal to (same as EQ)',
        valueType: 'Any value',
        examples: ['value: 100', 'value: "hello"']
    },
    NEQ: {
        description: 'Not equal to (!=)',
        valueType: 'Any value',
        examples: ['value: 0', 'value: "goodbye"']
    },
    '!=': {
        description: 'Not equal to (same as NEQ)',
        valueType: 'Any value',
        examples: ['value: 0']
    },
    GT: {
        description: 'Greater than (>)',
        valueType: 'Number or expression string',
        examples: ['value: 100', 'value: "${state.count}"']
    },
    '>': {
        description: 'Greater than (same as GT)',
        valueType: 'Number or expression string',
        examples: ['value: 50']
    },
    GTE: {
        description: 'Greater than or equal to (>=)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '>=': {
        description: 'Greater than or equal to (same as GTE)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    LT: {
        description: 'Less than (<)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '<': {
        description: 'Less than (same as LT)',
        valueType: 'Number or expression string',
        examples: ['value: 50']
    },
    LTE: {
        description: 'Less than or equal to (<=)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '<=': {
        description: 'Less than or equal to (same as LTE)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    IN: {
        description: 'Value is in the given list',
        valueType: 'Array of values',
        examples: ['value: [1, 2, 3]', 'value: ["a", "b", "c"]']
    },
    NOT_IN: {
        description: 'Value is not in the given list',
        valueType: 'Array of values',
        examples: ['value: [0, null]']
    },
    CONTAINS: {
        description: 'String contains substring, or array includes item',
        valueType: 'String (for substring) or Array (for item check)',
        examples: ['value: "hello"', 'value: ["item1", "item2"]']
    },
    MATCHES: {
        description: 'Value matches the regular expression pattern',
        valueType: 'String (regex pattern)',
        examples: ['value: "^[A-Z].*"', 'value: "\\\\d{3}-\\\\d{4}"']
    },
    RANGE: {
        description: 'Value is within the specified range [min, max] (inclusive)',
        valueType: 'Array of exactly 2 numbers: [min, max]',
        examples: ['value: [0, 100]', 'value: [1, 10]']
    },
    SINCE: {
        description: 'Date/time is after or equal to the specified value',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-01-01"']
    },
    AFTER: {
        description: 'Date/time is after the specified value (alias for SINCE)',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-01-01T00:00:00Z"']
    },
    BEFORE: {
        description: 'Date/time is before the specified value',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-12-31"']
    },
    UNTIL: {
        description: 'Date/time is before or equal to the specified value (alias for BEFORE)',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-12-31T23:59:59Z"']
    },
    AND: {
        description: 'Logical AND - all conditions must be true',
        valueType: 'Used in condition groups',
        examples: ['operator: AND\nconditions:\n  - field: data.x\n    operator: GT\n    value: 0']
    },
    OR: {
        description: 'Logical OR - at least one condition must be true',
        valueType: 'Used in condition groups',
        examples: ['operator: OR\nconditions:\n  - field: data.x\n    operator: EQ\n    value: 1']
    }
};

const CONDITION_FIELD_DOCS: Record<string, { description: string; values?: string }> = {
    field: {
        description: 'The field path to check (e.g., `data.amount`, `event.user.id`)',
        values: 'String path using dot notation'
    },
    operator: {
        description: 'The comparison operator to use',
        values: 'One of: EQ, ==, NEQ, !=, GT, >, GTE, >=, LT, <, LTE, <=, IN, NOT_IN, CONTAINS, MATCHES, RANGE, SINCE, AFTER, BEFORE, UNTIL'
    },
    value: {
        description: 'The value to compare against (type depends on operator)',
        values: 'Varies by operator - see operator documentation for details'
    },
    conditions: {
        description: 'Array of sub-conditions for AND/OR groups',
        values: 'Array of condition objects'
    }
};

const ACTION_FIELD_DOCS: Record<string, { description: string; values?: string }> = {
    type: {
        description: 'The type of action to perform',
        values: 'String action type (e.g., `log`, `execute`, `http`, `STATE_SET`, `EMIT_EVENT`)'
    },
    params: {
        description: 'Parameters for the action (varies by action type)',
        values: 'Object with action-specific parameters'
    },
    delay: {
        description: 'Delay in milliseconds before executing this action',
        values: 'Non-negative integer (milliseconds)'
    },
    probability: {
        description: 'Probability of executing this action (0.0 to 1.0)',
        values: 'Number between 0 and 1 or expression (e.g. "${lastResult > 0 ? 1 : 0}")'
    },
    mode: {
        description: 'Execution mode for action groups',
        values: 'ALL (execute all), SEQUENCE (execute in order), or EITHER (execute one randomly)'
    },
    actions: {
        description: 'Array of sub-actions for action groups',
        values: 'Array of action objects'
    }
};

const ACTION_TYPE_DOCS: Record<string, { description: string; params: string[] }> = {
    log: {
        description: 'Prints a message to the engine console for debugging',
        params: ['message: string (supports interpolation)']
    },
    math: {
        description: 'Expression to evaluate (e.g. "1 + 2" or "\'Hi \' + data.user")',
        params: ['expression: string (e.g. "1 + 2" or "\'Hello \' + data.name")']
    },
    execute: {
        description: 'Runs a shell command on the host (Node.js only)',
        params: ['command: string', 'safe: boolean']
    },
    STATE_SET: {
        description: 'Updates a value in the global state manager',
        params: ['key: string', 'value: any']
    }
};

/**
 * Get hover information for a position in the document
 */
export function getHover(document: TextDocument, position: Position): Hover | null {
    // Load data from import directives only (declarative approach)
    const imports = getImportDirectives(document, document.uri);
    if (imports.length > 0) {
        loadDataFromImports(imports);
    } else {
        // Clear data context when no imports are defined
        globalDataContext.clear();
    }
    
    const text = document.getText();
    const offset = document.offsetAt(position);
    const doc = parseDocument(text);

    if (!doc.contents) return null;


    // Check if we're hovering over a math expression value
    const path = findPathAtOffset(doc.contents, offset);
    if (path && path.length > 0) {
        const targetNode = path[path.length - 1];
        if (isScalar(targetNode) && targetNode.range) {
            const parentPair = path[path.length - 2];
            if (isPair(parentPair) && isScalar(parentPair.key) && String(parentPair.key.value) === 'expression') {
                const expression = String(targetNode.value);
                const lastResultVal = expression.includes('lastResult') ? traceLastResult(doc, offset) : undefined;
                const evaluated = simpleEvaluate(expression, { lastResult: lastResultVal });
                if (evaluated !== undefined) {
                    const markdown: MarkupContent = {
                        kind: 'markdown',
                        value: [
                            `**Math Expression Evaluation**`,
                            '',
                            `\`${expression}\``,
                            '',
                            lastResultVal !== undefined ? `*Simulated lastResult: ${JSON.stringify(lastResultVal)}*` : '',
                            '',
                            '**Evaluated Result:**',
                            '```json',
                            JSON.stringify(evaluated, null, 2),
                            '```'
                        ].filter(l => l !== '').join('\n')
                    };
                    return { contents: markdown };
                }
            }
        }
    }

    // Check if we're hovering over a template variable
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const templateHover = checkTemplateVariableHover(line, position, document);
    if (templateHover) {
        return templateHover;
    }

    // Use the path we already found
    if (!path || path.length === 0) return null;

    const targetNode = path[path.length - 1];
    
    // Check if we're hovering on a key
    if ('key' in targetNode! && targetNode.key) {
        const keyNode = targetNode.key;
        if (isScalar(keyNode) && keyNode.range) {
            const [keyStart, keyEnd] = keyNode.range;
            if (offset >= keyStart && offset <= keyEnd) {
                const keyValue = String(keyNode.value);
                const hoverContent = getKeyDocumentation(keyValue, path);
                if (hoverContent) {
                    return {
                        contents: hoverContent
                    };
                }
            }
        }
    }

    // Check if we're hovering on a value that is an operator
    if (isScalar(targetNode) && targetNode.range) {
        const [valueStart, valueEnd] = targetNode.range;
        if (offset >= valueStart && offset <= valueEnd) {
            const value = String(targetNode.value);
            // Check if this is an operator value
            if (OPERATOR_DOCS[value]) {
                const opDoc = OPERATOR_DOCS[value];
                const markdown: MarkupContent = {
                    kind: 'markdown',
                    value: [
                        `**Operator: \`${value}\`**`,
                        '',
                        opDoc.description,
                        '',
                        `**Value Type:** ${opDoc.valueType}`,
                        ...(opDoc.examples ? ['', '**Examples:**', ...opDoc.examples.map(ex => `\`\`\`yaml\n${ex}\n\`\`\``)] : [])
                    ].join('\n')
                };
                return { contents: markdown };
            }

            // Check if this is an action type value
            if (ACTION_TYPE_DOCS[value]) {
                const actionDoc = ACTION_TYPE_DOCS[value];
                const markdown: MarkupContent = {
                    kind: 'markdown',
                    value: [
                        `**Action: \`${value}\`**`,
                        '',
                        actionDoc.description,
                        '',
                        '**Parameters:**',
                        ...actionDoc.params.map(p => `- ${p}`)
                    ].join('\n')
                };
                return { contents: markdown };
            }
        }
    }

    return null;
}

/**
 * Check if hovering over a template variable and return hover info
 */
function checkTemplateVariableHover(line: string, position: Position, document: TextDocument): Hover | null {
    const character = position.character;
    const regex = /\$\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        // Check if cursor is inside this template
        if (character >= start && character <= end) {
            const variablePath = match[1]!.trim();
            const currentOffset = document.offsetAt({ line: position.line, character: start + 2 }); 
            
            // Try to get value from data context
            let value: any = globalDataContext.getValue(variablePath);
            let description = '';
            let simulated = false;
            
            // Special handling for legacy/built-in variables
            if (value === undefined) {
                if (variablePath === 'lastResult') {
                    description = 'The result returned by the previous action in a sequence.';
                    
                    // Try to simulate lastResult by tracing back
                    const text = document.getText();
                    const doc = parseDocument(text);
                    const tracedResult = traceLastResult(doc, currentOffset);
                    if (tracedResult !== undefined) {
                        value = tracedResult;
                        simulated = true;
                    } else {
                        value = 'Any';
                    }
                } else if (variablePath === 'data') {
                    description = 'The payload data for the current event.';
                    value = '{ ... }';
                } else if (variablePath === 'state') {
                    description = 'The current state of the rule engine.';
                    value = '{ ... }';
                } else if (variablePath === 'globals') {
                    description = 'Global variables available across all rules.';
                    value = '{ ... }';
                } else if (variablePath === 'helpers') {
                    description = 'Utility functions available in the context.';
                    value = '{ ... }';
                } else if (variablePath === 'Math') {
                    description = 'Standard JavaScript Math functions.';
                    value = 'Math Namespace';
                }
            }

            if (value !== undefined) {
                const formattedValue = typeof value === 'string' && (value === 'Any' || value === '{ ... }' || value === 'Math Namespace') 
                    ? `*${value}*` 
                    : globalDataContext.getFormattedValue(value);
                    
                const valueType = typeof value === 'object' && value !== null
                    ? (Array.isArray(value) ? 'array' : 'object')
                    : typeof value;
                
                const markdown: MarkupContent = {
                    kind: 'markdown',
                    value: [
                        `**Template Variable: \`\${${variablePath}}\`**`,
                        '',
                        description ? `${description}` : '',
                        '',
                        `**Type:** \`${valueType}\``,
                        '',
                        simulated ? '**Simulated value (from previous action):**' : '**Current/Test Value:**',
                        '```json',
                        formattedValue,
                        '```'
                    ].filter(p => p !== '').join('\n')
                };
                
                return { contents: markdown };
            } else {
                // Variable not found in data context
                const markdown: MarkupContent = {
                    kind: 'markdown',
                    value: [
                        `**Template Variable: \`\${${variablePath}}\`**`,
                        '',
                        '_No test data available for this variable._',
                        '',
                        'Add a `data.json` or `data.yaml` file in your workspace to provide test values.'
                    ].join('\n')
                };
                
                return { contents: markdown };
            }
        }
    }
    
    return null;
}



/**
 * Traces the value of lastResult by looking at previous actions in the same rule
 */
function traceLastResult(doc: any, offset: number): any {
    if (!doc.contents) return undefined;
    
    // 1. Find the current action map
    const path = findPathAtOffsetManual(doc.contents, offset);
    if (!path) return undefined;
    
    let currentAction: any = null;
    let actionsList: any[] = [];
    
    // Walk up to find the action map and the list it belongs to
    for (let i = path.length - 1; i >= 0; i--) {
        const node = path[i];
        if (isMap(node)) {
            const hasType = node.items.some(p => isPair(p) && isScalar(p.key) && String(p.key.value) === 'type');
            if (hasType) {
                currentAction = node;
            }
        }
        if (Array.isArray((node as any).items)) {
            // Check if this is an 'actions' list
            const parent = path[i-1];
            if (isPair(parent) && isScalar(parent.key) && (String(parent.key.value) === 'actions' || String(parent.key.value) === 'do')) {
                actionsList = (node as any).items;
                break;
            }
        }
    }
    
    if (!currentAction || actionsList.length === 0) return undefined;
    
    // 2. Find index of current action
    const currentIndex = actionsList.indexOf(currentAction);
    if (currentIndex <= 0) return undefined; // No previous action
    
    // 3. Look at previous actions (backwards) to find the nearest producer of lastResult
    // We simulate by looking at the previous action
    const prevAction = actionsList[currentIndex - 1];
    if (isMap(prevAction)) {
        const typePair = prevAction.items.find(p => isPair(p) && isScalar(p.key) && String(p.key.value) === 'type');
        const paramsPair = prevAction.items.find(p => isPair(p) && isScalar(p.key) && String(p.key.value) === 'params');
        
        if (typePair && isScalar(typePair.value) && String(typePair.value.value) === 'math' && paramsPair && isMap(paramsPair.value)) {
            const exprPair = paramsPair.value.items.find(p => isPair(p) && isScalar(p.key) && String(p.key.value) === 'expression');
            if (exprPair && isScalar(exprPair.value)) {
                const expression = String(exprPair.value.value);
                // Recursively trace back to get the context for the previous expression
                const prevActionOffset = prevAction.range ? prevAction.range[0] : 0;
                const prevLastResult = prevActionOffset > 0 ? traceLastResult(doc, prevActionOffset) : undefined;
                return simpleEvaluate(expression, { lastResult: prevLastResult });
            }
        }
    }
    
    return undefined;
}

/**
 * Simple evaluator for math expressions in the LSP
 */
function simpleEvaluate(expression: string, context: Record<string, any> = {}): any {
    try {
        const allData = globalDataContext.getValue('') || {};
        
        // Handle template interpolation first to match engine behavior
        let interpolated = expression.replace(/\$\{([^}]+)\}/g, (match, path) => {
            // Check provided context first (e.g. for simulated lastResult)
            if (path in context) {
                const val = context[path];
                return typeof val === 'string' ? val : JSON.stringify(val);
            }
            const val = globalDataContext.getValue(path);
            if (val !== undefined) return typeof val === 'string' ? val : JSON.stringify(val);
            return match;
        });

        // If it was just an interpolation and now has no ${}, it might be a result
        if (expression.includes("${") && !interpolated.includes("${")) {
             // If result is number-like, return it as number
             if (!isNaN(Number(interpolated)) && interpolated.trim() !== "") {
                 return Number(interpolated);
             }
             return interpolated;
        }

        // Try to evaluate as JS expression if it doesn't have ${}
        if (!interpolated.includes("${")) {
            const fullContext = { ...allData, ...context, Math };
            return new Function('ctx', 'with(ctx) { try { return ' + interpolated + '; } catch(e) { return undefined; } }')(fullContext);
        }
        
        return undefined;
    } catch (e) {
        return undefined;
    }
}

/**
 * Manual findPathAtOffset since the one in the file is specifically for hovers
 */
function findPathAtOffsetManual(node: any, offset: number, currentPath: any[] = []): any[] | null {
    if (!node) return null;
    
    const isPairLocal = (n: any): n is Pair => n && typeof n === 'object' && 'key' in n && 'value' in n;
    
    if (isPairLocal(node)) {
        const newPath = [...currentPath, node];
        if (node.value) {
            const vPath = findPathAtOffsetManual(node.value, offset, newPath);
            if (vPath) return vPath;
        }
        return null;
    }
    
    if (!node.range) return null;
    const [start, end] = node.range;
    if (offset < start || offset > end) return null;
    
    const newPath = [...currentPath, node];
    
    if (isMap(node)) {
        for (const item of node.items) {
            const iPath = findPathAtOffsetManual(item, offset, newPath);
            if (iPath) return iPath;
        }
    } else if (node.items && Array.isArray(node.items)) {
        for (const item of node.items) {
            const iPath = findPathAtOffsetManual(item, offset, newPath);
            if (iPath) return iPath;
        }
    }
    
    return newPath;
}


/**
 * Get documentation for a specific key based on its context
 */
function getKeyDocumentation(key: string, path: (Node | Pair)[]): MarkupContent | null {
    // Try to determine context
    const parentContext = getParentContext(path);
    
    let doc: { description: string; values?: string; examples?: string[] } | undefined;

    // Check in order of specificity
    if (parentContext === 'action') {
        doc = ACTION_FIELD_DOCS[key];
    } else if (parentContext === 'condition') {
        doc = CONDITION_FIELD_DOCS[key];
    }
    
    // Fall back to general field docs
    if (!doc) {
        doc = FIELD_DOCS[key];
    }

    if (!doc) return null;

    const parts: string[] = [
        `**${key}**`,
        '',
        doc.description
    ];

    if (doc.values) {
        parts.push('', `**Allowed Values:** ${doc.values}`);
    }

    if (doc.examples && doc.examples.length > 0) {
        parts.push('', '**Examples:**');
        doc.examples.forEach(example => {
            parts.push(`\`\`\`yaml\n${example}\n\`\`\``);
        });
    }

    return {
        kind: 'markdown',
        value: parts.join('\n')
    };
}

/**
 * Determine the parent context (rule, condition, action) from the path
 */
function getParentContext(path: (Node | Pair)[]): 'rule' | 'condition' | 'action' | 'unknown' {
    // Walk up the path to find context clues
    for (let i = path.length - 1; i >= 0; i--) {
        const node = path[i];
        
        if (!('key' in node!) || !node.key) continue;
        if (!isScalar(node.key)) continue;
        
        const keyValue = String(node.key.value);
        
        // If we're inside an 'if' or 'conditions', we're in condition context
        if (keyValue === 'if' || keyValue === 'conditions') {
            return 'condition';
        }
        
        // If we're inside a 'do' or 'actions', we're in action context
        if (keyValue === 'do' || keyValue === 'actions') {
            return 'action';
        }
    }
    
    return 'rule';
}

function findPathAtOffset(node: Node | Pair | null, offset: number, currentPath: (Node | Pair)[] = []): (Node | Pair)[] | null {
    if (!node) return null;
    
    // For Pair types, we need to check manually if they can be processed
    // Pairs are used in Maps, and we need different logic for them
    const isPair = (n: unknown): n is Pair => typeof n === 'object' && n !== null && 'key' in n && 'value' in n;
    
    if (isPair(node)) {
        // Pair doesn't have range, but we can check its key and value
        const pair = node;
        const newPath = [...currentPath, node];
        
        // Check if key has range and if offset is within it
        if (pair.key && typeof pair.key === 'object' && 'range' in pair.key) {
            const keyNode = pair.key as Node;
            if (keyNode.range) {
                const [keyStart, keyEnd] = keyNode.range;
                if (offset >= keyStart && offset <= keyEnd) {
                    return newPath;
                }
            }
        }
        
        // Check value recursively
        if (pair.value) {
            const valuePath = findPathAtOffset(pair.value as Node, offset, newPath);
            if (valuePath) return valuePath;
        }
        
        return null;
    }
    
    // From here, we're dealing with Node types that should have range
    if (!('range' in node) || !node.range) return null;
    
    const [start, end] = node.range;
    if (offset < start || offset > end) return null;

    // Add current node to path
    const newPath = [...currentPath, node];

    // If it's a Map, check items (which are Pairs)
    if (isMap(node)) {
        for (const item of node.items) {
            const itemPath = findPathAtOffset(item as Pair, offset, newPath);
            if (itemPath) return itemPath;
        }
        return newPath;
    }

    // If it's a Seq, check items
    if ('items' in node && Array.isArray((node).items)) {
        for (const item of (node).items) {
            const itemPath = findPathAtOffset(item as Node, offset, newPath);
            if (itemPath) return itemPath;
        }
        return newPath;
    }

    // Scalar or other leaf node
    return newPath;
}
