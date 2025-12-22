import type { Hover, MarkupContent, Position } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument, isMap, isScalar, type Node, type Pair } from 'yaml';
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
        values: 'Number between 0 and 1 (e.g., 0.5 for 50% chance)'
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

    // Check if we're hovering over a template variable
    const lines = text.split('\n');
    const line = lines[position.line] || '';
    const templateHover = checkTemplateVariableHover(line, position.character);
    if (templateHover) {
        return templateHover;
    }

    // Find the node at the cursor position
    const path = findPathAtOffset(doc.contents, offset);
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
        }
    }

    return null;
}

/**
 * Check if hovering over a template variable and return hover info
 */
function checkTemplateVariableHover(line: string, character: number): Hover | null {
    const regex = /\$\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;
        
        // Check if cursor is inside this template
        if (character >= start && character <= end) {
            const variablePath = match[1]!.trim();
            
            // Try to get value from data context
            const value = globalDataContext.getValue(variablePath);
            
            if (value !== undefined) {
                const formattedValue = globalDataContext.getFormattedValue(value);
                const valueType = typeof value === 'object' && value !== null
                    ? (Array.isArray(value) ? 'array' : 'object')
                    : typeof value;
                
                const markdown: MarkupContent = {
                    kind: 'markdown',
                    value: [
                        `**Template Variable: \`\${${variablePath}}\`**`,
                        '',
                        `**Type:** \`${valueType}\``,
                        '',
                        '**Test Value:**',
                        '```json',
                        formattedValue,
                        '```'
                    ].join('\n')
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
