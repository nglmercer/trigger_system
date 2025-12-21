# Agnostic Trigger System

An advanced, event-driven rule engine for creating dynamic, stateful logic in any TypeScript/Bun application.

## 📚 Documentation Directory

Detailed documentation is available in the `docs/` folder. Use the links below to navigate.

### [🚀 Getting Started](./docs/GETTING_STARTED.md)

_Standard installation, concepts, and creating your first rule._

- Installation
- Basic Rule Structure
- Running the Engine

### [📦 SDK Guide](./docs/SDK_GUIDE.md)

_Create rules programmatically and export them to YAML._

- `RuleBuilder` (Fluent API)
- `RuleExporter` (YAML generation)
- Server vs Client SDK

### [📖 API Reference](./docs/API_REFERENCE.md)

_Technical details on classes, interfaces, and types._

- `RuleEngine`
- `TriggerLoader`
- `triggerEmitter` ([Observability](./docs/OBSERVABILITY.md))
- Condition Operators (`EQ`, `GT`, `MATCHES`, etc.)

### [🧩 Architecture](./docs/ARCHITECTURE.md)

_How the system works under the hood._

- System Diagram
- Core Components (Loader, Engine, Expression, State)
- Data Flow

### [⚡ Stateful Triggers](./docs/STATEFUL_TRIGGERS.md)

_Guide to advanced logic like counters, sequences, and combos._

- Accessing `state` in rules
- Modifying state (`STATE_SET`, `STATE_INCREMENT`)
- Examples (Repetition Goals, Combo Sequences)

### [🛠️ Developer Tools](./docs/developer_tools.md)

_Tools to help you build and debug rules._

- CLI Validator (`bun run validate`)
- VS Code LSP Integration
- Circular Dependency Detection

### [📝 YAML Best Practices](./docs/yaml-best-practices.md)

_Recommended formats for writing rule files._

- List Format (Recommended)
- Multi-Document Format (Legacy)
- Migration Guide

### [💡 Step-by-Step Examples](./docs/EXAMPLES_GUIDE.md)

_Learn by doing with progressive tutorials._

- 1.0 Basic Rule
- 1.1 Multiple Conditions
- 1.3 Stateful Counters
- 2.0 SDK Usage

---

## 📦 Installation & Import Options

```bash
npm install trigger_system
```

### Import Patterns

The package supports multiple import patterns for different environments:

```typescript
// Universal import (auto-detects environment)
import * as sdk from 'trigger_system';

// Node.js specific import (includes file system features)
import * as nodeSdk from 'trigger_system/node';

// Client/Browser import (optimized for browser environments)
import * as clientSdk from 'trigger_system/client';
// or
import * as browserSdk from 'trigger_system/browser';
```

### Environment-Specific Features

- **Node.js**: Includes `FilePersistence`, `TriggerLoader` for file system access
- **Browser**: Includes `BrowserPersistence`, excludes Node.js-specific modules
- **Universal**: Core functionality that works in any environment

## Quick Example

```yaml
# rules/example.yaml
id: "high-value-transaction"
on: "PAYMENT_RECEIVED"
if:
  field: "data.amount"
  operator: "GT"
  value: 100
do:
  type: "send_alert"
  params:
    message: "Big spender! $${data.amount}"
```

## Features

- **Protocol Agnostic**: Works with HTTP, WebSockets, Game Events, CLI, etc.
- **Hot Reloading**: Edit rules in YAML and see changes instantly.
- **Type-Safe**: Built with TypeScript and ArkType for robust validation.
- **Stateful**: Memories and counters allow for complex behaviors.
