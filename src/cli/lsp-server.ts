#!/usr/bin/env node

import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { getCompletionItems } from '../lsp/completions';
import { getHover } from '../lsp/hover';
import { getDiagnosticsForText } from '../lsp/diagnostics';
import { getSemanticTokens, semanticTokensLegend } from '../lsp/semantic_tokens';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';

// Crear conexión LSP
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

console.error('LSP Server starting...');

connection.onInitialize(() => {
    console.error('LSP Server initialized');
    return {
        capabilities: {
            textDocumentSync: 1, // Full sync
            completionProvider: {
                triggerCharacters: [':', ' ', '-', '$', '{', '.', '[']
            },
            hoverProvider: true,
            semanticTokensProvider: {
                legend: semanticTokensLegend,
                full: true
            }
        }
    };
});

// Manejar completado
connection.onCompletion((params) => {
    console.error(`Completion requested: ${JSON.stringify(params)}`);
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        console.error('Document not found');
        return [];
    }
    
    try {
        const completions = getCompletionItems(document, params.position);
        console.error(`Returning ${completions.length} completions`);
        return completions;
    } catch (error) {
        console.error('Error in completion:', error);
        return [];
    }
});

// Manejar hover
connection.onHover((params) => {
    console.error(`Hover requested: ${JSON.stringify(params)}`);
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        console.error('Document not found');
        return null;
    }
    
    try {
        return getHover(document, params.position);
    } catch (error) {
        console.error('Error in hover:', error);
        return null;
    }
});

// Manejar semantic tokens
connection.languages.semanticTokens.on((params) => {
    console.error(`Semantic tokens requested: ${JSON.stringify(params)}`);
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        console.error('Document not found');
        return { data: [] };
    }
    
    try {
        const text = document.getText();
        const tokens = getSemanticTokens(text);
        console.error(`Returning ${tokens.length} semantic tokens`);
        return { data: tokens };
    } catch (error) {
        console.error('Error in semantic tokens:', error);
        return { data: [] };
    }
});

// Validar documentos al cambiar
documents.onDidChangeContent(async (change) => {
    console.error(`Document changed: ${change.document.uri}`);
    try {
        const text = change.document.getText();
        const diagnostics = await getDiagnosticsForText(text);
        connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
        console.error(`Sent ${diagnostics.length} diagnostics`);
    } catch (error) {
        console.error('Error in validation:', error);
    }
});

// Iniciar
documents.listen(connection);
connection.listen();

console.error('LSP Server ready');