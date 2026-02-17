#!/bin/bash
set -e

# Setup directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

ZED_EXT_DIR="$HOME/.local/share/zed/extensions/installed/trigger-system"
if [[ "$OSTYPE" == "darwin"* ]]; then
    ZED_EXT_DIR="$HOME/Library/Application Support/Zed/extensions/installed/trigger-system"
fi

echo "🚀 Installing Trigger System Extension..."
echo "📍 SCRIPT_DIR: $SCRIPT_DIR"
echo "📍 PROJECT_ROOT: $PROJECT_ROOT"
echo "📍 TARGET_DIR: $ZED_EXT_DIR"

# 1. Build LSP
echo "🏗️  Building LSP bundle..."
cd "$PROJECT_ROOT"
bun run build:lsp

# 2. Build WASM
echo "🏗️  Building Rust extension (WASM)..."
cd "$SCRIPT_DIR"
rustup target add wasm32-wasip1
cargo build --target wasm32-wasip1 --release

# 3. Prepare Installation Folder
rm -rf "$ZED_EXT_DIR"
mkdir -p "$ZED_EXT_DIR"

# 4. Copying Files (VERBOSE)
echo "📂 Copying files..."

# extension.wasm (Must be this name for Zed to load it)
cp -v "$SCRIPT_DIR/target/wasm32-wasip1/release/trigger_system_lsp.wasm" "$ZED_EXT_DIR/extension.wasm"

# extension.toml
cp -v "$SCRIPT_DIR/extension.toml" "$ZED_EXT_DIR/extension.toml"

# server.bundle.js
cp -v "$PROJECT_ROOT/vscode-extension/dist/lsp/server.bundle.js" "$ZED_EXT_DIR/server.bundle.js"

# languages/
cp -rv "$SCRIPT_DIR/languages" "$ZED_EXT_DIR/"

echo "✨ Done! Files in $ZED_EXT_DIR:"
ls -F "$ZED_EXT_DIR"

echo "👉 Manual Action: Restart Zed and open a .yaml file."
