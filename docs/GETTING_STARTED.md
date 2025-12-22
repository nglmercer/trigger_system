# 🚀 Getting Started

This guide will help you install and start using the Agnostic Trigger System in your TypeScript/Bun application.

## Installation

```bash
npm install trigger_system
# or
bun add trigger_system
```

## Basic Concepts

The Agnostic Trigger System is an event-driven rule engine that allows you to define business logic in YAML files. Here are the core concepts:

- **Triggers**: Events that fire when certain conditions are met
- **Rules**: YAML definitions that specify when triggers should fire and what actions to take
- **Actions**: Operations performed when a rule matches
- **State**: Persistent data that can be modified and accessed across rule executions

## Your First Rule

Create a file `rules/welcome.yaml`:

```yaml
id: "welcome-message"
on: "USER_REGISTERED"
if:
  field: "data.plan"
  operator: "EQ"
  value: "premium"
do:
  type: "send_email"
  params:
    template: "welcome_premium"
    subject: "Welcome to Premium!"
```

## Running the Engine

### Basic Setup (Node.js/Bun)

```typescript
import { RuleEngine } from "trigger_system";
import { TriggerLoader } from "trigger_system/node";

// 1. Load rules from your directory
const rules = await TriggerLoader.loadRulesFromDir("./rules");

// 2. Initialize the engine
const engine = new RuleEngine({
  rules: rules,
  globalSettings: { debugMode: true },
});

// 3. Process an event
const results = await engine.processEventSimple("USER_REGISTERED", {
  userId: "123",
  plan: "premium",
  email: "user@example.com",
});

console.log("Results:", results);
```

### With TypeScript Types

```typescript
import { RuleEngine } from "trigger_system";
import { TriggerLoader } from "trigger_system/node";

interface UserRegisteredData {
  userId: string;
  plan: "free" | "premium" | "enterprise";
  email: string;
}

const engine = new RuleEngine({
  rules: await TriggerLoader.loadRulesFromDir("./rules"),
  globalSettings: {},
});

// Type-safe event data
const userData: UserRegisteredData = {
  userId: "123",
  plan: "premium",
  email: "user@example.com",
};

await engine.processEventSimple("USER_REGISTERED", userData);
```

## Rule Structure

Every rule follows this structure:

```yaml
id: "unique-rule-id" # Required: Unique identifier
on: "EVENT_NAME" # Required: Event to listen for
if: # Optional: Conditions to check
  field: "data.field.path" # Field to evaluate
  operator: "EQ" # Comparison operator
  value: "expected_value" # Value to compare against
do: # Required: Action to perform
  type: "action_type" # Action identifier
  params: # Action parameters
    key: "value"
```

## Available Operators

| Operator   | Description           | Example                         |
| ---------- | --------------------- | ------------------------------- |
| `EQ`       | Equal                 | `value: "premium"`              |
| `NEQ`      | Not equal             | `value: "premium"`              |
| `GT`       | Greater than          | `value: 100`                    |
| `GTE`      | Greater than or equal | `value: 100`                    |
| `LT`       | Less than             | `value: 100`                    |
| `LTE`      | Less than or equal    | `value: 100`                    |
| `MATCHES`  | Regex match           | `value: "^[A-Z].*"`             |
| `IN`       | In array              | `value: ["admin", "moderator"]` |
| `NOT_IN`   | Not in array          | `value: ["guest", "banned"]`    |
| `CONTAINS` | String/Array contains | `value: "foo"`                  |

## Next Steps

- Learn about [SDK Usage](./SDK_GUIDE.md) for programmatic rule creation
- Explore [Stateful Triggers](./STATEFUL_TRIGGERS.md) for advanced logic
- Check out [Examples](./EXAMPLES_GUIDE.md) for common use cases
- Read the [API Reference](./API_REFERENCE.md) for technical details
