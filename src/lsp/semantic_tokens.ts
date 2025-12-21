
import {
    SemanticTokensBuilder
} from 'vscode-languageserver/node';
import type { SemanticTokensLegend } from 'vscode-languageserver/node';
import { parseDocument, isMap, isSeq, isScalar, LineCounter } from 'yaml';
import type { Node, Pair, Scalar } from 'yaml';

// Define the legend
export const semanticTokensLegend: SemanticTokensLegend = {
    tokenTypes: [
        'property', // 0
        'keyword',  // 1
        'function', // 2
        'string',   // 3
        'number',   // 4
        'operator', // 5
        'variable',  // 6
        'parameter', // 7
        'comment',   // 8
        'type',      // 9 - for directive types
        'macro',     // 10 - for import directives
        'namespace', // 11 - for lint control directives
        'enumMember' // 12 - for rule control directives
    ],
    tokenModifiers: [
        'declaration',
        'readonly'
    ]
};

const TOKEN_TYPES = {
    property: 0,
    keyword: 1,
    function: 2,
    string: 3,
    number: 4,
    operator: 5,
    variable: 6,
    parameter: 7,
    comment: 8,
    type: 9,
    macro: 10,
    namespace: 11,
    enumMember: 12
};

export function getSemanticTokens(text: string): number[] {
    const lineCounter = new LineCounter();
    const doc = parseDocument(text, { lineCounter });
    const builder = new SemanticTokensBuilder();

    if (doc.contents) {
        visit(doc.contents, builder, lineCounter);
    }

    // Process comments for directives
    processCommentsForDirectives(text, builder, lineCounter);

    return builder.build().data;
}

/**
 * Process comments to highlight directives
 */
function processCommentsForDirectives(text: string, builder: SemanticTokensBuilder, lineCounter: LineCounter) {
    const lines = text.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex] || '';
        
        // Check if line is a comment
        if (!line.trim().startsWith('#')) continue;
        
        // Look for directives in the comment
        const directiveRegex = /@([\w-]+)/g;
        let match;
        
        while ((match = directiveRegex.exec(line)) !== null) {
            const directiveName = match[1];
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;
            
            // Calculate position in the document
            let charOffset = 0;
            for (let i = 0; i < lineIndex; i++) {
                const currentLine = lines[i] || '';
                charOffset += currentLine.length + 1; // +1 for newline
            }
            charOffset += startIndex;
            
            const startPos = lineCounter.linePos(charOffset);
            
            // Determine token type based on directive with specific colors for each type
            let tokenType = TOKEN_TYPES.keyword;
            
            switch (directiveName) {
                case 'import':
                    tokenType = TOKEN_TYPES.macro; // Import directives as macros (distinctive color)
                    break;
                case 'disable-lint':
                case 'enable-lint':
                    tokenType = TOKEN_TYPES.namespace; // Global lint control as namespace
                    break;
                case 'disable-next-line':
                case 'disable-line':
                    tokenType = TOKEN_TYPES.enumMember; // Line-specific control as enum member
                    break;
                case 'disable-rule':
                case 'enable-rule':
                    tokenType = TOKEN_TYPES.type; // Rule-specific control as type
                    break;
                default:
                    tokenType = TOKEN_TYPES.keyword;
            }
            
            builder.push(
                startPos.line - 1,
                startPos.col - 1,
                endIndex - startIndex,
                tokenType,
                0
            );
        }
        
        // Also highlight the @ symbol
        const atSymbolRegex = /@/g;
        while ((match = atSymbolRegex.exec(line)) !== null) {
            const startIndex = match.index;
            const charOffset = lineIndex * (line.length + 1) + startIndex;
            const pos = lineCounter.linePos(charOffset);
            
            builder.push(
                pos.line - 1,
                pos.col - 1,
                1, // @ symbol length
                TOKEN_TYPES.operator,
                0
            );
        }
    }
}

function visit(node: Node | null, builder: SemanticTokensBuilder, lineCounter: LineCounter) {
    if (!node) return;

    if (isMap(node)) {
        for (const pair of node.items) {
            visitPair(pair, builder, lineCounter);
        }
    } else if (isSeq(node)) {
        for (const item of node.items) {
            visit(item as Node, builder, lineCounter);
        }
    }
}

function visitPair(pair: Pair, builder: SemanticTokensBuilder, lineCounter: LineCounter) {
    const key = pair.key as Scalar;
    // Ensure key exists and has a range
    if (key && key.range) {
        const keyText = String(key.value);
        let type = TOKEN_TYPES.property;

        // Custom coloring logic 
        if (['if', 'when', 'conditions', 'match'].includes(keyText)) {
            type = TOKEN_TYPES.keyword; 
        } else if (['do', 'actions', 'then', 'execute'].includes(keyText)) {
            type = TOKEN_TYPES.function; 
        } else if (['id', 'rule', 'name'].includes(keyText)) {
            type = TOKEN_TYPES.variable; 
        } else if (['on', 'trigger', 'events'].includes(keyText)) {
            type = TOKEN_TYPES.parameter;
        } else if (['operator', 'op'].includes(keyText)) {
             type = TOKEN_TYPES.operator;
        }
        

        const startPos = lineCounter.linePos(key.range[0]);
        // linePos returns 1-based line and col
        builder.push(
            startPos.line - 1, 
            startPos.col - 1, 
            key.range[1] - key.range[0], 
            type, 
            0
        );
    }
    
    if (pair.value) {
        visit(pair.value as Node, builder, lineCounter);
    }
}
