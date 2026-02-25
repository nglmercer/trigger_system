import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LspEngine } from '../src/lsp/engine';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const engine = new LspEngine();

// Serve static files from current directory and dist
app.use(express.static(path.join(__dirname, 'public')));
app.use('/src', express.static(path.join(__dirname, 'src')));

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('lsp:initialize', (params, callback) => {
        console.log('LSP Initialize received');
        callback({
            capabilities: {
                textDocumentSync: 1, // Full
                completionProvider: {
                    resolveProvider: false,
                    triggerCharacters: [':', ' ', '-', '$', '{', '.', '[', '@', '#', '"', "'"]
                },
                hoverProvider: true,
                definitionProvider: true
            }
        });
    });

    socket.on('lsp:didChange', async (params) => {
        console.log('LSP didChange received for', params.textDocument.uri);
        const { textDocument, contentChanges } = params;
        const text = contentChanges[0].text;
        const diagnostics = await engine.getDiagnostics(text, textDocument.uri);
        console.log('Sending diagnostics:', diagnostics.length);
        socket.emit('lsp:publishDiagnostics', {
            uri: textDocument.uri,
            diagnostics
        });
    });

    socket.on('lsp:completion', (params, callback) => {
        const { text, uri, position } = params;
        const completions = engine.getCompletions(text, uri, position);
        callback(completions);
    });

    socket.on('lsp:hover', (params, callback) => {
        const { text, uri, position } = params;
        const hover = engine.getHover(text, uri, position);
        callback(hover);
    });

    socket.on('lsp:definition', (params, callback) => {
        const { text, uri, position } = params;
        const definition = engine.getDefinition(text, uri, position);
        callback(definition);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`LSP Socket.io Server running at http://localhost:${PORT}`);
});
