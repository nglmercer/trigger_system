# Trigger System - Zed Extension

Language support for Trigger System YAML rules in Zed editor.

## Features

- **Syntax Highlighting**: Tree-sitter based highlighting for "Trigger YAML".
- **Language Server**: Full LSP support for:
  - Auto-completion
  - Diagnostics/Validation
  - Hover information
  - Go to definition
  - Semantic tokens

## Requirements

1. **Node.js**: Required to run the LSP server (v18 or higher).
2. **Rust**: Required to build the extension (latest stable) with `wasm32-wasip1` target.
3. **Bun**: Required to build the LSP server bundle.

## Quick Start (Official Build & Install)

The easiest way to build and install everything portably is using the script in the project root:

```bash
# From the project root (trigger_system/)
bun run install:zed
```

This command:

1. Builds the LSP server bundle.
2. Builds the Rust extension for WASM.
3. Creates the Zed extension folder and copies all necessary files (`extension.wasm`, `extension.toml`, `server.bundle.js`, and `languages/`).

---

## Manual Installation Steps (Portable)

If you prefer to run steps manually, follow these paths from the project root:

### 1. Build everything

```bash
bun run build:lsp
cd zed-extension && cargo build --target wasm32-wasip1 --release && cd ..
```

### 2. Install to Zed

From the project root:

**Linux:**

```bash
# Create directory
mkdir -p ~/.local/share/zed/extensions/installed/trigger-system

# Copy files using relative paths from the root
cp zed-extension/target/wasm32-wasip1/release/trigger_system_lsp.wasm ~/.local/share/zed/extensions/installed/trigger-system/extension.wasm
cp zed-extension/extension.toml ~/.local/share/zed/extensions/installed/trigger-system/
cp vscode-extension/dist/lsp/server.bundle.js ~/.local/share/zed/extensions/installed/trigger-system/
cp -r zed-extension/languages ~/.local/share/zed/extensions/installed/trigger-system/
```

**macOS:**

```bash
# Create directory
mkdir -p ~/Library/Application\ Support/Zed/extensions/installed/trigger-system

# Copy files using relative paths from the root
cp zed-extension/target/wasm32-wasip1/release/trigger_system_lsp.wasm ~/Library/Application\ Support/Zed/extensions/installed/trigger-system/extension.wasm
cp zed-extension/extension.toml ~/Library/Application\ Support/Zed/extensions/installed/trigger-system/
cp vscode-extension/dist/lsp/server.bundle.js ~/Library/Application\ Support/Zed/extensions/installed/trigger-system/
cp -r zed-extension/languages ~/Library/Application\ Support/Zed/extensions/installed/trigger-system/
```

### 3. Restart Zed

Close and reopen Zed. Open a `.trigger.yaml` file to activate.

## Development

The extension is designed to be portable. It searches for the LSP server in:

1. `vscode-extension/dist/lsp/server.bundle.js` (relative to your open project).
2. `server.bundle.js` (inside the extension's installation folder).

This means it will work both when you are developing the project and when the extension is installed standalone.

## Troubleshooting

Open Zed's logs (`Ctrl+Shift+P` -> `zed: open log`) and search for `trigger-system` to debug any issues with the LSP startup.
