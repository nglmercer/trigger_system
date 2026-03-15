# Trigger Editor

A browser-based visual editor for [Trigger System](https://github.com/nglmercer/trigger_system) rules. Built with Lit web components, this editor provides a clean form interface for creating and managing trigger rules with YAML export functionality.

## ✨ Features

- **Visual Rule Editor** - Create and edit trigger rules through a clean form interface
- **Modal-Based Editing** - Easy-to-use modal dialogs for rule creation/editing
- **YAML Export** - Export rules as clean YAML or JSON format
- **Condition Builder** - Add conditions with a variety of comparison operators
- **Action Editor** - Configure actions with parameters, delays, and probability
- **Dark Mode** - Built-in dark mode support
- **Callbacks & Events** - Rich event system for integration
- **Modular Components** - Use individual components or the full editor

## 📦 Installation

```bash
npm install trigger-editor
# or
bun add trigger-editor
```

## 🚀 Quick Start

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="path/to/dist/index.js"></script>
</head>
<body>
  <trigger-editor id="editor"></trigger-editor>
  
  <script>
    const editor = document.getElementById('editor');
    
    // Configure the editor
    editor.config = {
      initialRules: [],
      darkMode: false,
      showYamlPreview: true,
      availableActions: 'log,http,notify,transform,delay,set_state',
      availableEvents: 'user.login,payment.received',
      onChange: (rules) => console.log('Rules changed:', rules),
      onExport: (rules, format) => console.log('Exported:', format, rules)
    };
    
    // Listen for events
    editor.addEventListener('rule-added', (e) => console.log('Rule added:', e.detail));
    editor.addEventListener('rule-updated', (e) => console.log('Rule updated:', e.detail));
    editor.addEventListener('rule-deleted', (e) => console.log('Rule deleted:', e.detail));
  </script>
</body>
</html>
```

## 🔧 API Reference

### `<trigger-editor>` Component

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `config` | `EditorConfig` | `undefined` | Editor configuration object |
| `darkmode` | `boolean` | `false` | Enable dark mode |

#### Methods

```typescript
// Get all rules
const rules = editor.getRules();

// Set rules programmatically
editor.setRules([
  {
    id: 'my-rule',
    on: 'user.login',
    do: { type: 'log', params: { message: 'User logged in' } }
  }
]);

// Open modal for new rule
editor.openNewRuleModal();

// Open modal for editing existing rule
const rule = rules[0];
editor.openEditRuleModal(rule);

// Close modal
editor.closeModal();

// Export as YAML
const yaml = editor.exportYaml();

// Export as JSON
const json = editor.exportJson();

// Validate all rules
const errors = editor.validateRules();
```

#### Events

| Event | Description |
|-------|-------------|
| `rule-added` | Fired when a new rule is added |
| `rule-updated` | Fired when a rule is updated |
| `rule-deleted` | Fired when a rule is deleted |
| `rules-exported` | Fired when rules are exported |
| `rules-changed` | Fired when rules collection changes |
| `validation-error` | Fired when validation fails |

### EditorConfig

```typescript
interface EditorConfig {
  initialRules?: TriggerRule[];
  darkMode?: boolean;
  showYamlPreview?: boolean;
  availableActions?: string;
  availableEvents?: string;
  validateRule?: (rule: TriggerRule) => EditorValidationError[];
  onExport?: (rules: TriggerRule[], format: 'yaml' | 'json') => void;
  onChange?: (rules: TriggerRule[]) => void;
}
```

## 🧩 Modular Components

You can also use individual components:

```typescript
import { RuleList, RuleForm, EditorModal } from 'trigger-editor';
```

### `<rule-list>`

Display a list of rules.

```html
<rule-list
  .rules=${myRules}
  @rule-edit=${handleEdit}
  @rule-delete=${handleDelete}
></rule-list>
```

### `<rule-form>`

The form component for editing rules.

```html
<rule-form
  .formData=${formData}
  .validationErrors=${errors}
  .showYamlPreview=${true}
  @form-change=${handleChange}
></rule-form>
```

### `<editor-modal>`

A modal dialog component.

```html
<editor-modal
  .open=${true}
  .isEdit=${false}
  @modal-close=${handleClose}
  @modal-confirm=${handleConfirm}
>
  <!-- Content -->
</editor-modal>
```

## 🎨 CSS Custom Properties

The editor uses CSS custom properties for theming:

```css
trigger-editor {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --danger-color: #dc2626;
  --success-color: #16a34a;
  --warning-color: #d97706;
  --background: #ffffff;
  --surface: #f8fafc;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-secondary: #64748b;
  --radius: 6px;
}
```

## 🔨 Building

```bash
# Install dependencies
bun install

# Build for browser
bun run build

# Development mode with watch
bun run dev
```

## 📝 Example

See the [main repository](https://github.com/nglmercer/trigger_system) for complete examples.

## License

MIT
