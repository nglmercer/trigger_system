const template = document.createElement('template');
template.innerHTML = `
<style>
    :host {
        display: block;
        font-family: monospace;
        border: 1px solid #ccc;
        position: relative;
    }
    .editor-container {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    textarea {
        width: 100%;
        height: 300px;
        border: none;
        padding: 10px;
        box-sizing: border-box;
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        resize: vertical;
    }
    .status-bar {
        background: #f0f0f0;
        padding: 5px 10px;
        font-size: 12px;
        border-top: 1px solid #ccc;
        display: flex;
        justify-content: space-between;
    }
    .diagnostics {
        color: red;
        font-size: 12px;
        padding: 5px 10px;
        background: #fff0f0;
        max-height: 100px;
        overflow-y: auto;
    }
    .completions {
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.1);
        z-index: 100;
        display: none;
        max-height: 200px;
        overflow-y: auto;
    }
    .completion-item {
        padding: 5px 10px;
        cursor: pointer;
    }
    .completion-item:hover {
        background: #e0e0e0;
    }
</style>
<div class="editor-container">
    <textarea id="editor" placeholder="Write your trigger rules here (YAML)..."></textarea>
    <div id="diagnostics" class="diagnostics" style="display: none;"></div>
    <div class="status-bar">
        <span id="status">Disconnected</span>
        <span id="cursor-pos">Line: 1, Col: 1</span>
    </div>
</div>
<div id="completions" class="completions"></div>
`;

import { io, Socket } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

export class TriggerEditor extends HTMLElement {
    private _shadowRoot: ShadowRoot;
    private _textarea: HTMLTextAreaElement;
    private _diagnosticsDiv: HTMLDivElement;
    private _completionsDiv: HTMLDivElement;
    private _statusSpan: HTMLSpanElement;
    private _cursorPosSpan: HTMLSpanElement;
    private _socket: Socket | null = null;
    private _uri: string = 'file:///demo.yaml';

    constructor() {
        super();
        this._shadowRoot = this.attachShadow({ mode: 'open' });
        this._shadowRoot.appendChild(template.content.cloneNode(true));

        this._textarea = this._shadowRoot.getElementById('editor') as HTMLTextAreaElement;
        this._diagnosticsDiv = this._shadowRoot.getElementById('diagnostics') as HTMLDivElement;
        this._completionsDiv = this._shadowRoot.getElementById('completions') as HTMLDivElement;
        this._statusSpan = this._shadowRoot.getElementById('status') as HTMLSpanElement;
        this._cursorPosSpan = this._shadowRoot.getElementById('cursor-pos') as HTMLSpanElement;
    }

    connectedCallback() {
        console.log('TriggerEditor connected');
        this.setupEvents();
        this.connectSocket();
    }

    private connectSocket() {
        const socketUrl = this.getAttribute('socket-url') || 'http://localhost:3001';
        this._socket = io(socketUrl);

        this._socket.on('connect', () => {
            this.setStatus('Connected');
            this._socket?.emit('lsp:initialize', {}, (result: any) => {
                console.log('LSP Initialized', result);
            });
        });

        this._socket.on('disconnect', () => {
            this.setStatus('Disconnected');
        });

        this._socket.on('lsp:publishDiagnostics', (params: any) => {
            if (params.uri === this._uri) {
                this.setDiagnostics(params.diagnostics);
            }
        });
    }

    private setupEvents() {
        this._textarea.addEventListener('input', () => this.onInput());
        this._textarea.addEventListener('keydown', (e) => this.onKeyDown(e));
        this._textarea.addEventListener('keyup', (e) => {
            this.updateCursorPos();
            if (e.key === '.' || e.key === ':' || (e.ctrlKey && e.key === ' ')) {
                this.requestCompletions();
            }
        });
        this._textarea.addEventListener('click', () => {
            this.updateCursorPos();
            this._completionsDiv.style.display = 'none';
        });
    }

    private onInput() {
        this._socket?.emit('lsp:didChange', {
            textDocument: { uri: this._uri, version: 1 },
            contentChanges: [{ text: this._textarea.value }]
        });
    }

    private requestCompletions() {
        const textBeforeCursor = this._textarea.value.substring(0, this._textarea.selectionStart);
        const lines = textBeforeCursor.split('\n');
        const position = {
            line: lines.length - 1,
            character: lines[lines.length - 1].length
        };

        this._socket?.emit('lsp:completion', {
            text: this._textarea.value,
            uri: this._uri,
            position
        }, (completions: any[]) => {
            this.showCompletions(completions);
        });
    }

    private onKeyDown(e: KeyboardEvent) {
        // Handle tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this._textarea.selectionStart;
            const end = this._textarea.selectionEnd;
            this._textarea.value = this._textarea.value.substring(0, start) + "  " + this._textarea.value.substring(end);
            this._textarea.selectionStart = this._textarea.selectionEnd = start + 2;
        }
    }

    private updateCursorPos() {
        const textBeforeCursor = this._textarea.value.substring(0, this._textarea.selectionStart);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;
        this._cursorPosSpan.textContent = `Line: ${line}, Col: ${col}`;
    }

    // API for the next step
    public setStatus(status: string) {
        this._statusSpan.textContent = status;
    }

    public setDiagnostics(diagnostics: any[]) {
        if (diagnostics.length === 0) {
            this._diagnosticsDiv.style.display = 'none';
            return;
        }
        this._diagnosticsDiv.style.display = 'block';
        this._diagnosticsDiv.innerHTML = diagnostics.map(d => `<div>[Line ${d.range.start.line + 1}] ${d.message}</div>`).join('');
    }

    public showCompletions(completions: any[]) {
        if (completions.length === 0) {
            this._completionsDiv.style.display = 'none';
            return;
        }

        this._completionsDiv.innerHTML = '';
        completions.forEach(item => {
            const div = document.createElement('div');
            div.className = 'completion-item';
            div.textContent = item.label;
            div.onclick = () => this.insertCompletion(item);
            this._completionsDiv.appendChild(div);
        });

        // Position completions near cursor (basic implementation)
        const { left, top } = this.getCursorXY();
        this._completionsDiv.style.left = `${left}px`;
        this._completionsDiv.style.top = `${top + 20}px`;
        this._completionsDiv.style.display = 'block';
    }

    private insertCompletion(item: any) {
        // Improved insertion: find the last word/trigger character to replace
        const start = this._textarea.selectionStart;
        const text = this._textarea.value;
        const textBefore = text.substring(0, start);

        // Find last trigger char or space
        const lastTriggerIdx = Math.max(
            textBefore.lastIndexOf(' '),
            textBefore.lastIndexOf('.'),
            textBefore.lastIndexOf(':'),
            textBefore.lastIndexOf('{'),
            textBefore.lastIndexOf('-')
        );

        const prefix = textBefore.substring(0, lastTriggerIdx + 1);
        const insertText = item.insertText || item.label;

        this._textarea.value = prefix + insertText + text.substring(start);
        this._completionsDiv.style.display = 'none';
        this._textarea.focus();
        this.onInput();
    }

    private getCursorXY() {
        // Better implementation using a ghost element to calculate cursor position
        const { selectionStart } = this._textarea;
        const textBeforeCursor = this._textarea.value.substring(0, selectionStart);

        const div = document.createElement('div');
        const style = window.getComputedStyle(this._textarea);

        // Copy relevant styles
        for (const prop of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'width']) {
            (div.style as any)[prop] = (style as any)[prop];
        }

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        div.style.top = '0';
        div.style.left = '0';

        div.textContent = textBeforeCursor;
        const span = document.createElement('span');
        span.textContent = '|';
        div.appendChild(span);

        this._shadowRoot.appendChild(div);
        const { offsetLeft: left, offsetTop: top } = span;
        this._shadowRoot.removeChild(div);

        return { left, top };
    }
}

customElements.define('trigger-editor', TriggerEditor);
