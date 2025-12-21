import * as path from 'path';
import { workspace,type ExtensionContext } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  console.log('Trigger System LSP Client: Activating extension...');
  
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

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'yaml' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'triggerSystemLsp',
    'Trigger System LSP',
    serverOptions,
    clientOptions
  );

  console.log('Trigger System LSP Client: Starting language client...');
  
  // Start the client. This will also launch the server
  client.start();
  
  console.log('Trigger System LSP Client: Extension activated successfully');
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
