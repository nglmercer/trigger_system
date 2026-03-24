import type { Hover, MarkupContent, Position } from 'vscode-languageserver/node';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { parseDocument, isMap, isScalar, isPair, type Node, type Pair } from 'yaml';
import { globalDataContext, loadDataFromImports } from './data-context';
import { getImportDirectives } from './directives';
import {
    FIELD_DOCS,
    OPERATOR_DOCS,
    CONDITION_FIELD_DOCS,
    ACTION_FIELD_DOCS,
    ACTION_TYPE_DOCS
} from './hover-constants';

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
                const evaluated = simpleEvaluate(expression, {});
                if (evaluated !== undefined) {
                    const markdown: MarkupContent = {
                        kind: 'markdown',
                        value: [
                            `**Math Expression Evaluation**`,
                            '',
                            `\`${expression}\``,
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

            // Check if this is a variable path meaning (used in field, left, right etc.)
            let isFieldPath = false;
            if (path.length >= 2) {
                const parentPair = path[path.length - 2];
                if (isPair(parentPair) && isScalar(parentPair.key)) {
                    const keyName = String(parentPair.key.value);
                    if (keyName === 'field' || keyName === 'left' || keyName === 'right') {
                        isFieldPath = true;
                    }
                }
            }

            const isKnownRoot = value === 'data' || value === 'env' || value === 'vars' || 
                                value.startsWith('data.') || value.startsWith('env.') || value.startsWith('vars.');
            
            if (isFieldPath || isKnownRoot) {
                return createVariableInfoHover(value, false);
            }
        }
    }

    return null;
}

/**
 * Create hover information for a variable path
 */
function createVariableInfoHover(variablePath: string, isTemplate: boolean): Hover {
    // Try to get value from data context
    let value: string | Record<string, any> | undefined = globalDataContext.getValue(variablePath);
    let description = '';

    // Special handling for legacy/built-in variables
    if (value === undefined) {
        if (variablePath === 'data') {
            description = 'The payload data for the current event.';
            value = '{ ... }';
        } else if (variablePath === 'vars') {
            description = 'Global variables available across all rules.';
            value = '{ ... }';
        } else if (variablePath === 'env') {
            description = 'Dynamic environment variables set during rule execution.';
            value = '{ ... }';
        } else if (variablePath === 'Math') {
            description = 'Standard JavaScript Math functions.';
            value = 'Math Namespace';
        }
    }

    const title = isTemplate ? `Template Variable: \`\${${variablePath}}\`` : `Variable Path: \`${variablePath}\``;

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
                `**${title}**`,
                '',
                description ? `${description}` : '',
                '',
                `**Type:** \`${valueType}\``,
                '',
                '**Current/Test Value:**',
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
                `**${title}**`,
                '',
                '_No test data available for this variable._',
                '',
                'Add a `data.json` or `data.yaml` file in your workspace to provide test values.'
            ].join('\n')
        };

        return { contents: markdown };
    }
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
            return createVariableInfoHover(variablePath, true);
        }
    }

    return null;
}

/**
 * Simple evaluator for math expressions in the LSP
 */
function simpleEvaluate(expression: string, context: Record<string, any> = {}) {
    try {
        const allData = globalDataContext.getValue('') || {};

        // Handle template interpolation first to match engine behavior
        let interpolated = expression.replace(/\$\{([^}]+)\}/g, (match, path) => {
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

    const isPair = (n: unknown): n is Pair => typeof n === 'object' && n !== null && 'key' in n && 'value' in n;

    if (isPair(node)) {
        const pair = node;
        const newPath = [...currentPath, node];
        if (pair.key && typeof pair.key === 'object' && 'range' in pair.key) {
            const keyNode = pair.key as Node;
            if (keyNode.range) {
                const [keyStart, keyEnd] = keyNode.range;
                if (offset >= keyStart && offset <= keyEnd) {
                    return newPath;
                }
            }
        }
        if (pair.value) {
            const valuePath = findPathAtOffset(pair.value as Node, offset, newPath);
            if (valuePath) return valuePath;
        }
        return null;
    }

    if (!('range' in node) || !node.range) return null;
    const [start, end] = node.range;
    if (offset < start || offset > end) return null;

    const newPath = [...currentPath, node];

    if (isMap(node)) {
        for (const item of node.items) {
            const itemPath = findPathAtOffset(item as Pair, offset, newPath);
            if (itemPath) return itemPath;
        }
        return newPath;
    }

    if ('items' in node && Array.isArray((node).items)) {
        for (const item of (node).items) {
            const itemPath = findPathAtOffset(item as Node, offset, newPath);
            if (itemPath) return itemPath;
        }
        return newPath;
    }

    return newPath;
}
