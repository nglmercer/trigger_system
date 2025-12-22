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
// Option 1: RuleEngine (recommended for Node.js - includes built-in actions)
import { RuleEngine, TriggerLoader } from "trigger_system/node";

// Option 2: TriggerEngine (platform-agnostic - works in browser too)
import { TriggerEngine, TriggerLoader } from "trigger_system";

// 1. Load Rules
const loader = new TriggerLoader("./rules");
const rules = await loader.loadRules();

// 2. Initialize Engine
const engine = new RuleEngine({ // or TriggerEngine for platform-agnostic
  rules: rules,
  globalSettings: { debugMode: true },
});

// 3. Register Custom Actions (optional for RuleEngine, required for TriggerEngine)
engine.registerAction("my_custom_action", async (ctx, params) => {
  console.log(`[CUSTOM] ${params.message}`);
});

// 4. Process an Event - two ways available:

// Option A: Using processEventSimple (convenience method)
const results = await engine.processEventSimple("USER_LOGIN", { username: "admin" });

// Option B: Using processEvent with full context
const context = {
  event: "USER_LOGIN",
  timestamp: Date.now(),
  data: { username: "admin" },
};
const results = await engine.processEvent(context);

console.log(results);
```

### Built-in Actions (RuleEngine only)

The RuleEngine includes many pre-built actions:

```yaml
# Logging
do:
  type: log
  params:
    message: "User ${data.username} logged in"

# HTTP Response (for web applications)
do:
  type: response
  params:
    statusCode: 200
    body: "Hello ${data.username}"

# Command Execution (Node.js only)
do:
  type: execute
  params:
    command: "echo 'User logged in'"
    safe: true

# HTTP Request Forwarding
do:
  type: forward
  params:
    url: "https://api.example.com/webhook"
    method: "POST"

# State Management
do:
  type: STATE_INCREMENT
  params:
    key: "login_count"
    amount: 1
```

### Engine Selection Guide

**Use RuleEngine when:**
- You're in Node.js environment
- Want built-in actions (log, response, STATE_*, etc.)
- Need automatic state management
- Want observability features

**Use TriggerEngine when:**
- Need browser compatibility
- Want minimal dependencies
- Need custom action handling
- Building lightweight applications

## Developer Experience (LSP)

For a superior development experience, use the built-in **LSP Server**. It provides:

- **Auto-completion** for all keys and enum values (like `mode` or `operator`).
- **Real-time validation** with descriptive error messages.
- **Snippets** for common rule structures.

See our [Developer Tools Guide](./developer_tools.md) for setup instructions.
