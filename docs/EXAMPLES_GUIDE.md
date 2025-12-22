# 📚 Examples Guide

This guide walks you through the progressive examples provided in the `examples/` directory. Each example builds on the previous one, introducing a new concept of the Agnostic Trigger System.

## [1. Basic Rule](./../examples/1-basic-rule.ts)

**Concept**: Simple event matching and actions.

- Listens for `USER_LOGIN`.
- Checks if a user is new (`data.isNew == true`).
- Logs a welcome message.

## [1.1 Multiple Conditions](./../examples/1.1-multiple-conditions.ts)

**Concept**: Logic grouping using `AND`/`OR`.

- Listens for `PURCHASE`.
- Requires BOTH `amount > 100` AND `category == 'electronics'`.
- Demonstrates how to write complex filters.

## [1.2 Advanced Operators](./../examples/1.2-advanced-operators.ts)

**Concept**: Using powerful operators beyond simple equality.

- `IN`: Check if a value exists in a predefined list (e.g., countries).
- `MATCHES`: Use Regular Expressions for string validation (e.g., email format).

## [1.3 Stateful Counter](./../examples/1.3-stateful-counter.ts)

**Concept**: Persistent state across multiple events.

- Demonstrates `STATE_INCREMENT` to keep track of clicks.
- Shows how to trigger a rule only when a state value reaches a specific threshold (Milestones).

## [1.4 Action Groups](./../examples/1.4-action-groups.ts)

**Concept**: Complex execution flows.

- `SEQUENCE`: Execute actions one after another with optional delays.
- `EITHER`: Pick exactly one action based on assigned probabilities (Loot boxes / Randomized behaviors).
- `probability`: Individual action probability (0-1) for randomized execution.

```yaml
# Example with probability
- id: random-reward
  on: USER_ACTION
  do:
    type: "log"
    probability: 0.3  # 30% chance to execute
    params:
      message: "You got lucky!"
```

## [2. SDK Usage](./../examples/2-sdk-usage.ts)

**Concept**: Programmatic rule creation.

- Uses `RuleBuilder` to create rules without writing YAML.
- Uses `RuleExporter` to convert rules to YAML strings or save them to disk.
- Ideal for building dashboard integrations or automated rule generation.

### Engine Selection

The SDK provides two engine options:

```typescript
// Full-featured engine (recommended)
import { RuleEngine } from "trigger_system/node";

// Simple engine (for basic use cases)
import { TriggerEngine } from "trigger_system";
```

### Built-in Actions in SDK

When using the SDK, you have access to all built-in actions:

```typescript
const rule = new RuleBuilder()
  .withId("example")
  .on("TEST_EVENT")
  .do("log", { message: "Hello World" })
  .do("STATE_INCREMENT", { key: "counter", amount: 1 })
  .do("forward", { url: "https://api.example.com", method: "POST" })
  .build();
```

---

### Running the Examples

You can run any example using `bun`:

```bash
bun run examples/1-basic-rule.ts
bun run examples/1.1-multiple-conditions.ts
# etc...
```
