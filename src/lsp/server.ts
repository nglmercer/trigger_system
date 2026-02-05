import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import type {
  CompletionItem,
  TextDocumentPositionParams,
  InitializeParams,
  InitializeResult,
  DefinitionParams,
  Definition,
  Location,
  Range
} from 'vscode-languageserver/node';
import {
  TextDocument
} from 'vscode-languageserver-textdocument';
import { getDiagnosticsForText } from './diagnostics';
import { getCompletionItems } from './completions';
import { semanticTokensLegend, getSemanticTokens } from './semantic_tokens';
import { getHover } from './hover';
import { getImportDirectives } from './directives';
import { existsSync } from 'fs';
import { resolveImportPath, uriToPath } from './path-utils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
  connection.console.log('Trigger System LSP Server initializing...');
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  connection.console.log(`Configuration capability: ${hasConfigurationCapability}`);
  connection.console.log(`Workspace folder capability: ${hasWorkspaceFolderCapability}`);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Enhanced completion provider with better trigger characters
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [':', ' ', '-', '$', '{', '.', '[', '@', '#', '"', "'"]
      },
      hoverProvider: true,
      definitionProvider: true, // Enable Go to Definition
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        full: true,
        range: true // Enable range semantic tokens
      },
      // Add document formatting support
      documentFormattingProvider: false, // Could be enabled later
      documentRangeFormattingProvider: false, // Could be enabled later
      // Add code action support for quick fixes
      codeActionProvider: false, // Could be enabled later
      // Add rename support
      renameProvider: false // Could be enabled later
    }
  };
  
  connection.console.log(`Server capabilities registered: ${JSON.stringify(result.capabilities, null, 2)}`);
  
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const diagnostics = await getDiagnosticsForText(text);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    connection.console.log(`Completion requested for document: ${_textDocumentPosition.textDocument.uri}`);
    connection.console.log(`Position: line ${_textDocumentPosition.position.line}, character ${_textDocumentPosition.position.character}`);
    
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
        connection.console.log('Document not found');
        return [];
    }
    
    connection.console.log(`Document found, getting completions...`);
    const completions = getCompletionItems(document, _textDocumentPosition.position);
    connection.console.log(`Found ${completions.length} completion items`);
    
    return completions;
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    /* 
    if (item.data === 1) {
      item.detail = 'TypeScript details';
      item.documentation = 'TypeScript documentation';
    }
    */
    return item;
  }
);

// Provide semantic tokens for the full document
connection.languages.semanticTokens.on((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { data: [] };
    }
    const text = document.getText();
    const tokens = getSemanticTokens(text);
    return { data: tokens };
});

// Provide semantic tokens for a range
connection.languages.semanticTokens.onRange((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { data: [] };
    }
    const text = document.getText();
    // For now, we return the full tokens even for range requests. 
    // Use getSemanticTokens with range filtering if performance becomes an issue.
    const tokens = getSemanticTokens(text);
    return { data: tokens };
});

// Provide hover information
connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    return getHover(document, params.position);
});

// Provide Go to Definition for import paths
connection.onDefinition((params: DefinitionParams): Definition | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    const text = document.getText();
    const position = params.position;
    const offset = document.offsetAt(position);
    
    // Find the line at the current position
    const lines = text.split('\n');
    let currentOffset = 0;
    let currentLine = 0;
    let lineStartOffset = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        if (!lineText) continue;
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
    
    // Check if we're in an import directive
    const importMatch = line.match(/#\s*@import\s+\w+\s+from\s+['"]([^'"]+)['"]/);
    if (!importMatch || !importMatch[1]) {
        return null;
    }
    
    const importPath = importMatch[1];
    const pathStart = line.indexOf(importPath);
    const pathEnd = pathStart + importPath.length;
    
    // Check if cursor is within the import path
    if (characterInLine < pathStart || characterInLine > pathEnd) {
        return null;
    }
    
    // Resolve the path
    try {
        const resolvedPath = resolveImportPath(document.uri, importPath);
        
        // Check if file exists
        if (!existsSync(resolvedPath)) {
            return null;
        }
        
        // Return the location
        return {
            uri: uriToPath(resolvedPath),
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 }
            }
        };
    } catch (error) {
        connection.console.log(`Error resolving import path: ${error}`);
        return null;
    }
});

documents.listen(connection);
connection.listen();
