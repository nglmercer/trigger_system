# Trigger System Zed Extension

A Zed extension providing syntax highlighting for the **Agnostic Trigger System** YAML-based trigger rules.

## Overview

This extension brings Trigger System support to the Zed editor, starting with **syntax highlighting only** for YAML-based trigger rules. This is a minimal implementation to test the build workflow before implementing full LSP integration.

## Features

### Current Features (v0.1.0)

- **Syntax Highlighting**: Custom highlighting for Trigger System keywords:
  - Keywords: `id`, `on`, `if`, `do`, `when`, `trigger`, `actions`, `conditions`
  - Operators: `EQ`, `GT`, `LT`, `GTE`, `LTE`, `MATCHES`, `IN`, `NOT_IN`, `AND`, `OR`, `NOT`
  - Properties: `field`, `value`, `type`, `params`
  - Template Variables: `${data.field}` style
- **YAML Support**: Uses Zed's built-in YAML grammar
- **File Detection**: Matches `.yaml` and `.yml` files

### Future Features (v0.2.0+)

- LSP integration for real-time validation
- Autocompletion for keywords and operators
- Hover documentation
- Schema validation

## Installation

### For Testing (Local Extension)

1. Clone the repository:

   ```bash
   git clone https://github.com/nglmercer/trigger_system
   cd trigger_system/zed-extension
   ```

2. In Zed:
   - Open the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
   - Run "Extensions: Install Local Extension"
   - Select the `zed-extension` folder

3. Open any `.yaml` or `.yml` file to test the syntax highlighting

## Project Structure

```
zed-extension/
├── extension.toml              # Extension manifest
├── README.md                   # This file
└── languages/
    └── trigger-system/
        ├── config.toml         # Language configuration
        └── highlights.scm      # Tree-sitter highlight queries
```

## Build Workflow

This is a **pure extension** - no compilation needed! 

Zed extensions that only provide syntax highlighting don't require building. They are loaded directly from the extension directory.

### To Test Changes

1. Make changes to `languages/trigger-system/highlights.scm`
2. Reload the extension in Zed:
   - Command palette → "Extensions: Reload Extension"
   - Or restart Zed

## Grammar Development

The syntax highlighting is defined in `highlights.scm` using Zed's Tree-sitter query syntax.

### Available Highlight Scopes

| Scope | Description |
|-------|-------------|
| `@keyword` | Control flow keywords (if, do, when, on) |
| `@operator` | Operators (EQ, GT, MATCHES, AND, OR) |
| `@property` | Property keys (id, field, value, params) |
| `@type` | Type indicators |
| `@string` | String values |
| `@number` | Numeric values |
| `@boolean` | Boolean values (true, false) |
| `@variable.special` | Template variables (`${...}`) |
| `@comment` | Comments |
| `@punctuation.delimiter` | Punctuation |

### Testing Your Changes

1. Open a Trigger System YAML file in Zed
2. Make changes to `highlights.scm`
3. Reload the extension
4. Check if the highlighting matches your expectations

## Integration with VS Code Extension

This Zed extension is designed to complement the existing VS Code extension:

| Feature | VS Code Extension | Zed Extension |
|---------|------------------|----------------|
| Syntax Highlighting | ✅ | ✅ (v0.1.0) |
| LSP Validation | ✅ | ❌ (planned) |
| Autocompletion | ✅ | ❌ (planned) |
| Hover Docs | ✅ | ❌ (planned) |

## Example YAML File

```yaml
# Example Trigger Rule
- id: "payment-success"
  on: "payment.completed"
  priority: 10
  if:
    - field: "data.amount"
      operator: "GT"
      value: 100
  do:
    - type: "send-email"
      params:
        template: "payment-confirmation"
```

With this extension, you'll see:
- `id`, `on`, `if`, `do`, `priority` highlighted as keywords
- `GT` highlighted as operator
- `type`, `params` highlighted as properties
- Template variables like `${data.amount}` highlighted specially

## Contributing

1. Fork the repository
2. Create a feature branch
3. Modify `highlights.scm` to add/edit highlight rules
4. Test in Zed by reloading the extension
5. Submit a pull request

## License

MIT License - See [LICENSE](../LICENSE) for details.

## Related Projects

- [Trigger System Core](../) - The main Trigger System library
- [VS Code Extension](../vscode-extension/) - Full-featured VS Code extension with LSP
- [Zed Editor](https://zed.dev) - The Zed text editor
- [Zed Extensions Docs](https://zed.dev/docs/extensions/languages) - Official documentation
