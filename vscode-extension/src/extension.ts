import * as path from 'path';
import { workspace, type ExtensionContext, commands, window, StatusBarAlignment, StatusBarItem } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;
let statusBarItem: StatusBarItem;
let isLspEnabled: boolean = true;
let Context: ExtensionContext | undefined;
/**
 * Smart detection function to check if a YAML file contains Trigger System content
 */
function isTriggerSystemYamlFile(document: any): boolean {
  if (!document || document.languageId !== 'yaml') {
    return false;
  }
  
  const text = document.getText();
  
  // Quick checks for trigger system patterns
  const triggerPatterns = [
    /\bid:\s*["']?[\w-]+["']?\s*$/m,           // id field
    /\bon:\s*[\w\[\]{},.\s]+$/m,                // on field with events
    /\bdo:\s*[\w\[\]{},.\s]+$/m,                // do field with actions
    /\bwhen:\s*[\w\[\]{},.\s]+$/m,              // when field with conditions
    /@(disable|enable)-(lint|rule|next-line|line)\b/m, // Directives
    /@import\s+\w+\s+from\s+['"]/m,            // Import directives
    /\boperator:\s*(EQ|GT|LT|GTE|LTE|MATCHES|IN|NOT_IN)\b/m, // Operators
    /\btrigger|rule|action|condition\b.*:/m     // Core trigger system keywords
  ];
  
  // Check if any pattern matches
  return triggerPatterns.some(pattern => pattern.test(text));
}

/**
 * Enhanced document selector that includes smart detection
 */
function createEnhancedDocumentSelector() {
  return [
    { scheme: 'file', language: 'yaml', pattern: '**/*.{yaml,yml}' },
    { scheme: 'untitled', language: 'yaml', pattern: '**/*.{yaml,yml}' }
  ];
}

function updateStatusBarItem(): void {
  if (statusBarItem) {
    statusBarItem.text = `$(sync~spin) Trigger LSP: ${isLspEnabled ? 'ON' : 'OFF'}`;
    statusBarItem.tooltip = isLspEnabled ? 'Trigger System LSP is enabled' : 'Trigger System LSP is disabled';
    statusBarItem.command = 'triggerSystem.toggleLSP';
  }
}

function initializeStatusBarItem(context: ExtensionContext): void {
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  statusBarItem.command = 'triggerSystem.toggleLSP';
  updateStatusBarItem();
  statusBarItem.show();
  
  context.subscriptions.push(statusBarItem);
}

async function toggleLSP(): Promise<void> {
  isLspEnabled = !isLspEnabled;
  
  if (isLspEnabled) {
    await enableLSP();
  } else {
    await disableLSP();
  }
  
  updateStatusBarItem();
}

async function enableLSP(): Promise<void> {
  if (!client) {
    console.log('Trigger System LSP Client: Creating new language client...');
    if (Context) createLanguageClient(Context);
  }
  
  if (client && client.state !== 2) { // 2 = Running state
    console.log('Trigger System LSP Client: Starting language client...');
    await client.start();
    window.showInformationMessage('Trigger System LSP server enabled');
  }
}

async function disableLSP(): Promise<void> {
  if (client && client.state === 2) { // 2 = Running state
    console.log('Trigger System LSP Client: Stopping language client...');
    await client.stop();
    window.showInformationMessage('Trigger System LSP server disabled');
  }
}

function createLanguageClient(context: ExtensionContext): void {
  // Try to find the server in different possible locations
  let serverPath: string;
  const possiblePaths = [
    path.join(context.extensionPath, 'dist', 'lsp', 'server.bundle.js'),   // Production (bundled)
    path.join(context.extensionPath, 'dist', 'lsp', 'server.js'),          // Legacy fallback
    path.join(context.extensionPath, '..', 'dist', 'lsp', 'server.bundle.js') // Development fallback
  ];
  
  for (const tryPath of possiblePaths) {
    if (require('fs').existsSync(tryPath)) {
      serverPath = tryPath;
      console.log(`Trigger System LSP Client: Found server at: ${serverPath}`);
      break;
    }
  }
  
  if (!serverPath!) {
    console.error('Trigger System LSP Client: Could not find server.js in any of:', possiblePaths);
    throw new Error('LSP Server not found. Please run "npm run build:all" first.');
  }
  
  // Use node to run the compiled JavaScript server
  const serverCommand = 'node';
  const serverArgs = [serverPath!, '--stdio'];
  
  // Set up environment to find node_modules from parent project
  const serverOptions: ServerOptions = {
    run: {
      command: serverCommand,
      args: serverArgs,
      transport: TransportKind.stdio,
      options: {
        env: {
          ...process.env,
          NODE_PATH: path.join(context.extensionPath, '..', 'node_modules')
        }
      }
    },
    debug: {
      command: serverCommand,
      args: serverArgs,
      transport: TransportKind.stdio,
      options: {
        env: {
          ...process.env,
          NODE_PATH: path.join(context.extensionPath, '..', 'node_modules')
        }
      }
    }
  };

  // Enhanced options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for YAML documents with enhanced selector
    documentSelector: createEnhancedDocumentSelector(),
    synchronize: {
      // Notify the server about file changes to YAML files and configuration files
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.yaml'),
        workspace.createFileSystemWatcher('**/*.yml'),
        workspace.createFileSystemWatcher('**/.clientrc'),
        workspace.createFileSystemWatcher('**/trigger-system.config.*')
      ]
    },
    // Add initialization options for better server communication
    initializationOptions: {
      triggerSystem: {
        enableSemanticTokens: true,
        enableHover: true,
        enableCompletions: true,
        enableDiagnostics: true
      }
    }
  };

  // Create the language client
  client = new LanguageClient(
    'triggerSystemLsp',
    'Trigger System LSP',
    serverOptions,
    clientOptions
  );
}

export function activate(context: ExtensionContext) {
  console.log('Trigger System LSP Client: Activating extension...');
  Context = context;
  // Initialize status bar item
  initializeStatusBarItem(context);
  
  // Register commands
  const toggleCommand = commands.registerCommand('triggerSystem.toggleLSP', toggleLSP);
  const enableCommand = commands.registerCommand('triggerSystem.enableLSP', enableLSP);
  const disableCommand = commands.registerCommand('triggerSystem.disableLSP', disableLSP);
  
  // Add commands to subscriptions
  context.subscriptions.push(toggleCommand);
  context.subscriptions.push(enableCommand);
  context.subscriptions.push(disableCommand);
  
  // Check configuration to see if LSP should be enabled by default
  const config = workspace.getConfiguration('triggerSystem.lsp');
  isLspEnabled = config.get('enabled', true);
  
  // Create language client if enabled
  if (isLspEnabled) {
    try {
      createLanguageClient(context);
      if (client) {
        client.start();
        console.log('Trigger System LSP Client: Language client started successfully');
      }
    } catch (error) {
      console.error('Trigger System LSP Client: Failed to start language client:', error);
      window.showErrorMessage(`Failed to start Trigger System LSP: ${error}`);
    }
  }
  
  updateStatusBarItem();
  
  // Add smart document detection for already open files
  const activeEditor = window.activeTextEditor;
  if (activeEditor && isTriggerSystemYamlFile(activeEditor.document)) {
    console.log('Trigger System LSP Client: Trigger system YAML file already open, ensuring LSP is active');
    if (isLspEnabled && !client) {
      try {
        createLanguageClient(context);
        if (client) {
          (client as any).start();
        }
      } catch (error) {
        console.error('Trigger System LSP Client: Failed to start language client for open file:', error);
      }
    }
  }
  
  // Listen for document opening events to provide smart activation
  const onDidOpenTextDocument = workspace.onDidOpenTextDocument((document) => {
    if (isTriggerSystemYamlFile(document)) {
      console.log('Trigger System LSP Client: Trigger system YAML file opened');
      if (isLspEnabled && !client) {
        try {
          createLanguageClient(context);
          if (client) {
            (client as any).start();
          }
          window.showInformationMessage('Trigger System LSP activated for this YAML file');
        } catch (error) {
          console.error('Trigger System LSP Client: Failed to start language client:', error);
        }
      }
    }
  });
  
  context.subscriptions.push(onDidOpenTextDocument);
  
  console.log('Trigger System LSP Client: Extension activated successfully');
}

export function deactivate(): Thenable<void> | undefined {
  console.log('Trigger System LSP Client: Deactivating extension...');
  
  if (statusBarItem) {
    statusBarItem.hide();
  }
  
  if (!client) {
    return undefined;
  }
  
  return client.stop();
}
