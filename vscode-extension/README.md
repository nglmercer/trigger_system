# Trigger System VS Code Extension

Official VS Code extension for the **Agnostic Trigger System**. This extension provides rich language support for YAML-based trigger rules, making it easier to build, debug, and maintain complex event-driven logic.

## 🌟 Overview

The **Trigger System** is a protocol-agnostic, event-driven engine designed to execute dynamic logic in real-time. This extension transforms VS Code into a first-class IDE for writing these rules by providing deep integration with the system's schema and data context.

Whether you are building complex game mechanics, payment workflows, or IoT automation, this extension ensures your rules are syntactically correct and perfectly typed before they ever reach production.

## Features

### 🔍 Real-time Validation

- Instant feedback on YAML syntax errors.
- Deep schema validation using **ArkType**.
- Highlight missing required fields (like `id`, `on`, `do`).

### ⌨️ Smart Autocompletion

- Suggestions for core operators: `on`, `if`, `do`, `when`.
- Context-aware completions for condition operators (e.g., `EQ`, `GT`, `MATCHES`).
- Suggestions for schema keys and common values.

### ℹ️ Hover Documentation

- Detailed descriptions for every field in the rule schema.
- Instant access to documentation for operators and action types.

### 🎯 Data Context & Templates

- Intelligent suggestions for template variables (e.g., `${data.percentage}`).
- Previews of variable values from your data source.

### 🛠️ Directive Support

- Control the linter with comments:
  - `# @disable-lint`: Disable all diagnostics for a file.
  - `# @disable-rule <id>`: Disable a specific validation rule.
  - `# @import alias from "./path"`: Import data for context.

### 📂 Smart Path Autocomplete

- **Cross-Platform**: Works seamlessly on Windows and Linux/Unix.
- **Directory Navigation**: Browse your project structure directly from import directives.
- **Quote Handling**: Intelligent quote insertion and handling.

## Getting Started

1. Install the extension from the VS Code Marketplace or by installing the `.vsix` file.
2. Open any `.yaml` or `.yml` file containing Trigger Rules.
3. **Activation**: The extension is **disabled by default** to avoid false positives. It activates automatically if:
   - The file contains a Trigger Rule structure (e.g., `id`, `on`, `do`).
   - You use a directive like `# @import` or `# @enable-lint`.

## Extension Settings

This extension contributes the following settings:

- `triggerSystem.lsp.trace.server`: Traces the communication between VS Code and the language server.

## Requirements

- VS Code version 1.75.0 or higher.
- (Recommended) The Agnostic Trigger System core library installed in your workspace.

## Development

If you want to build the extension from source:

1. Clone the repository.
2. Run `bun install` in the root and in `vscode-extension/`.
3. Run `bun run build:all` to bundle the server and client.
4. Use `vsce package` to create the VSIX.

---

Built with ❤️ using **Bun** and **TypeScript**.
