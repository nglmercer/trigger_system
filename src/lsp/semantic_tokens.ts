
import {
    SemanticTokensBuilder
} from 'vscode-languageserver/node';
import type { SemanticTokensLegend } from 'vscode-languageserver/node';
import { parseDocument, isMap, isSeq, isScalar, LineCounter } from 'yaml';
import type { Node, Pair, Scalar } from 'yaml';

// Define the legend with enhanced directive coloring
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
        'macro',     // 10 - for import directives (blue/cyan)
        'namespace', // 11 - for lint control directives (green)
        'enumMember', // 12 - for rule control directives (orange)
        'class',      // 13 - for disable-lint (red)
        'struct',     // 14 - for enable-lint (green)
        'event',      // 15 - for disable-next-line (yellow)
        'interface',  // 16 - for disable-line (purple)
        'decorator'   // 17 - for @ symbol (gold)
    ],
    tokenModifiers: [
        'declaration',
        'readonly',
        'deprecated',
        'modification',
        'documentation'
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
    enumMember: 12,
    class: 13,
    struct: 14,
    event: 15,
    interface: 16,
    decorator: 17
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
            
            // Determine token type based on directive with enhanced specific colors
            let tokenType = TOKEN_TYPES.keyword;
            let tokenModifiers = 0;
            
            switch (directiveName) {
                case 'import':
                    tokenType = TOKEN_TYPES.macro; // Import directives as macros (blue/cyan)
                    tokenModifiers = 1; // readonly modifier
                    break;
                case 'disable-lint':
                    tokenType = TOKEN_TYPES.class; // Global disable as class (red/warning color)
                    tokenModifiers = 4; // modification modifier
                    break;
                case 'enable-lint':
                    tokenType = TOKEN_TYPES.struct; // Global enable as struct (green/success color)
                    tokenModifiers = 1; // readonly modifier
                    break;
                case 'disable-next-line':
                    tokenType = TOKEN_TYPES.event; // Line-specific as event (yellow/caution color)
                    tokenModifiers = 2; // deprecated modifier
                    break;
                case 'disable-line':
                    tokenType = TOKEN_TYPES.interface; // Current line as interface (purple/special color)
                    tokenModifiers = 2; // deprecated modifier
                    break;
                case 'disable-rule':
                    tokenType = TOKEN_TYPES.type; // Rule disable as type (orange/warning color)
                    tokenModifiers = 4; // modification modifier
                    break;
                case 'enable-rule':
                    tokenType = TOKEN_TYPES.enumMember; // Rule enable as enum member (green/success color)
                    tokenModifiers = 1; // readonly modifier
                    break;
                default:
                    tokenType = TOKEN_TYPES.keyword;
                    tokenModifiers = 0;
            }
            
            builder.push(
                startPos.line - 1,
                startPos.col - 1,
                endIndex - startIndex,
                tokenType,
                tokenModifiers
            );
        }
        
        // Also highlight the @ symbol with decorator styling (gold color)
        const atSymbolRegex = /@/g;
        while ((match = atSymbolRegex.exec(line)) !== null) {
            const startIndex = match.index;
            const charOffset = lineIndex * (line.length + 1) + startIndex;
            const pos = lineCounter.linePos(charOffset);
            
            builder.push(
                pos.line - 1,
                pos.col - 1,
                1, // @ symbol length
                TOKEN_TYPES.decorator,
                1 // readonly modifier for @ symbol
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
