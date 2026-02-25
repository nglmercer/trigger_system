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
  Definition
} from 'vscode-languageserver/node';
import {
  TextDocument
} from 'vscode-languageserver-textdocument';
import { semanticTokensLegend } from './semantic_tokens';
import { LspEngine } from './engine';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

const engine = new LspEngine();

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let workspaceFolders: string[] = [];

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

  // Capture workspace folders from initialization params
  if (params.workspaceFolders) {
    workspaceFolders = params.workspaceFolders.map(folder => folder.uri);
    connection.console.log(`Workspace folders: ${JSON.stringify(workspaceFolders)}`);
  }

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
  const diagnostics = await engine.getDiagnostics(text, textDocument.uri, workspaceFolders);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const document = documents.get(_textDocumentPosition.textDocument.uri);
    if (!document) {
        return [];
    }

    return engine.getCompletions(document.getText(), document.uri, _textDocumentPosition.position);
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    return item;
  }
);

// Provide semantic tokens for the full document
connection.languages.semanticTokens.on((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { data: [] };
    }
    const tokens = engine.getSemanticTokens(document.getText());
    return { data: tokens };
});

// Provide semantic tokens for a range
connection.languages.semanticTokens.onRange((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return { data: [] };
    }
    const tokens = engine.getSemanticTokens(document.getText());
    return { data: tokens };
});

// Provide hover information
connection.onHover((params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }
    return engine.getHover(document.getText(), document.uri, params.position);
});

// Provide Go to Definition for import paths
connection.onDefinition((params: DefinitionParams) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
        return null;
    }

    return engine.getDefinition(document.getText(), document.uri, params.position);
});

documents.listen(connection);
connection.listen();
