import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDiagnosticsForText } from './diagnostics';
import { getCompletionItems } from './completions';
import { getHover } from './hover';
import { getSemanticTokens } from './semantic_tokens';
import { resolveImportPath, pathToUri } from './path-utils';
import { existsSync } from 'fs';

export interface LspPosition {
    line: number;
    character: number;
}

export class LspEngine {
    async getDiagnostics(text: string, uri: string, workspaceFolders: string[] = []) {
        return await getDiagnosticsForText(text, uri, workspaceFolders);
    }

    getCompletions(text: string, uri: string, position: LspPosition) {
        const document = TextDocument.create(uri, 'yaml', 1, text);
        return getCompletionItems(document, position);
    }

    getHover(text: string, uri: string, position: LspPosition) {
        const document = TextDocument.create(uri, 'yaml', 1, text);
        return getHover(document, position);
    }

    getSemanticTokens(text: string) {
        return getSemanticTokens(text);
    }

    getDefinition(text: string, uri: string, position: LspPosition) {
        const document = TextDocument.create(uri, 'yaml', 1, text);
        const offset = document.offsetAt(position);

        const lines = text.split('\n');
        let currentOffset = 0;
        let currentLine = 0;
        let lineStartOffset = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            if (lineText === undefined) continue;
            const lineLength = lineText.length + 1; // +1 for newline
            if (currentOffset + lineLength > offset) {
                currentLine = i;
                lineStartOffset = currentOffset;
                break;
            }
            currentOffset += lineLength;
        }

        const line = lines[currentLine] || '';
        const characterInLine = offset - lineStartOffset;

        const importMatch = line.match(/#\s*@import\s+\w+\s+from\s+['"]([^'"]+)['"]/);
        if (!importMatch || !importMatch[1]) {
            return null;
        }

        const importPath = importMatch[1];
        const pathStart = line.indexOf(importPath);
        const pathEnd = pathStart + importPath.length;

        if (characterInLine < pathStart || characterInLine > pathEnd) {
            return null;
        }

        try {
            const resolvedPath = resolveImportPath(uri, importPath);
            if (!existsSync(resolvedPath)) {
                return null;
            }

            return {
                uri: pathToUri(resolvedPath),
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 }
                }
            };
        } catch (error) {
            return null;
        }
    }
}
