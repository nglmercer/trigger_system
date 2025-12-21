# Getting Started with Agnostic Trigger System

The Agnostic Trigger System is a flexible, rule-based engine designed to execute actions based on events and complex conditions. It is perfect for automation, game logic, or event-driven applications.

## Installation

```bash
bun install @your-org/trigger-system
```

_(Replace `@your-org/trigger-system` with the actual package name if published)_

## Concepts

- **Rule**: A definition of _when_ (Event), _if_ (Conditions), and _then_ (Actions).
- **Context**: The data environment (`event`, `data`, `globals`, `state`) passed to the engine.
- **Engine**: The core class that takes events and rules to produce results.

## Your First Rule

Create a YAML file (e.g., `rules/hello.yaml`):

```yaml
id: "welcome-user"
on: "USER_LOGIN"
if:
  field: "data.username"
  operator: "EQ"
  value: "admin"
do:
  type: "log"
  params:
    message: "Welcome back, Administrator!"
```

## Running the Engine

```typescript
import { RuleEngine, TriggerLoader } from "./src"; // Import from your build

// 1. Load Rules
const loader = new TriggerLoader("./rules");
const rules = await loader.loadRules();

// 2. Initialize Engine
const engine = new RuleEngine({
  rules: rules,
  globalSettings: { debugMode: true },
});

// 3. Register Actions
engine.registerAction("log", async (ctx, params) => {
  console.log(`[LOG] ${params.message}`);
});

// 4. Process an Event
const context = {
  event: "USER_LOGIN",
  timestamp: Date.now(),
  data: { username: "admin" },
};

const results = await engine.processEvent(context);
console.log(results);
```

## Developer Experience (LSP)

For a superior development experience, use the built-in **LSP Server**. It provides:

- **Auto-completion** for all keys and enum values (like `mode` or `operator`).
- **Real-time validation** with descriptive error messages.
- **Snippets** for common rule structures.

See our [Developer Tools Guide](./developer_tools.md) for setup instructions.
