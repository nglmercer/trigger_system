# 🛠️ SDK Guide

The Trigger System SDK provides a type-safe, fluent API to create rules programmatically. This is useful for building dynamic rule-management systems or when you want to avoid manual YAML editing.

## Installation

The SDK is exported from the main package:

```typescript
import { RuleBuilder, RuleExporter } from "trigger_system";
```

## RuleBuilder

The `RuleBuilder` class provides a chainable interface to construct a `TriggerRule`.

### Basic Usage

```typescript
const rule = new RuleBuilder()
  .withId("my-rule-id")
  .on("EVENT_NAME")
  .if("data.price", ">", 50)
  .do("SEND_NOTIFICATION", { title: "Price Alert" })
  .build();
```

### Complex Conditions

For nested `AND`/`OR` logic, use `ifComplex`:

```typescript
rule.ifComplex((q) =>
  q
    .where("data.status", "==", "active")
    .or((sub) =>
      sub.where("data.role", "==", "admin").where("data.premium", "==", true)
    )
);
```

### Action Groups

To execute multiple actions or use specific modes:

```typescript
rule.doComplex((a) =>
  a
    .setMode("SEQUENCE")
    .add("LOG", { message: "Starting..." })
    .add("NOTIFY", { user: 123 }, { delay: 1000 })
);
```

## RuleExporter

Once you have a rule object, you can export it to YAML format.

### To YAML String

```typescript
const yamlString = RuleExporter.toYaml(rule);
```

### To File (Server-side/Node only)

```typescript
await RuleExporter.saveToFile(rule, "./rules/new-rule.yaml");
```

## Server SDK vs Client SDK

- **Client SDK**: Includes `RuleBuilder` and `toYaml`. Works in Browser and Node.
- **Server SDK**: Includes everything plus `saveToFile` (imported from `src/node`).

### Browser Usage

```typescript
import { RuleBuilder, RuleExporter } from "trigger_system";
// RuleExporter.saveToFile will throw an error here
```

### Node Usage

```typescript
import {
  RuleBuilder,
  RuleExporter,
  TriggerLoader,
  RuleEngine,
} from "trigger_system/node";

// 1. Build
const rule = new RuleBuilder().withId("test").on("EVENT").do("LOG").build();

// 2. Save
await RuleExporter.saveToFile(rule, "./rules/my-rule.yaml");

// 3. Load everything from a directory
const rules = await TriggerLoader.loadRulesFromDir("./rules");

// 4. Initialize Engine
const engine = new RuleEngine({ rules, globalSettings: {} });
```
