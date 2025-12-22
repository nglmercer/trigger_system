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
- **Server SDK**: Includes everything plus `saveToFile` and Node-specific features.

### Engine Architecture

The SDK provides a hierarchical engine architecture:

```typescript
// Base Engine: TriggerEngine (platform-agnostic)
import { TriggerEngine } from "trigger_system";

// Extended Engine: RuleEngine (adds observability, state, built-in actions)
import { RuleEngine } from "trigger_system/node";
```

### Engine Selection

**Use TriggerEngine when:**
- You need platform-agnostic compatibility (browser + Node.js)
- You want minimal dependencies
- You need custom action handling
- You're building a lightweight application

**Use RuleEngine when:**
- You need built-in actions (log, response, STATE_*, etc.)
- You want automatic state management
- You need observability/event emission
- You're building a full-featured application

### Browser Usage

```typescript
import { RuleBuilder, RuleExporter, TriggerEngine } from "trigger_system";

// Build rules programmatically
const rule = new RuleBuilder()
  .withId("browser-rule")
  .on("CLICK")
  .do("log", { message: "Button clicked" })
  .build();

// Export to YAML (browser compatible)
const yamlString = RuleExporter.toYaml(rule);

// Use simpler engine
const engine = new TriggerEngine([rule]);
// Note: RuleExporter.saveToFile will throw an error in browser
```

### Browser Usage (TriggerEngine)

```typescript
import { TriggerEngine, RuleBuilder, RuleExporter } from "trigger_system";

// 1. Build rules
const rule = new RuleBuilder()
  .withId("browser-rule")
  .on("CLICK")
  .do("log", { message: "Button clicked" })
  .build();

// 2. Export to YAML
const yamlString = RuleExporter.toYaml(rule);

// 3. Create platform-agnostic engine
const engine = new TriggerEngine([rule]);

// 4. Register custom actions
engine.registerAction("log", (params, context) => {
  console.log(`[LOG] ${params.message}`);
});

// 5. Process events - use processEventSimple for convenience
const results = await engine.processEventSimple("CLICK", { button: "submit" });
// Or use processEvent with full context:
// const results = await engine.processEvent({ event: "CLICK", data: { button: "submit" }, timestamp: Date.now() });
```

### Node Usage (RuleEngine - Recommended)

```typescript
import {
  RuleBuilder,
  RuleExporter,
  TriggerLoader,
  RuleEngine, // Extended engine with built-in features
  FileSystemPersistence,
  StateManager,
} from "trigger_system/node";

// 1. Build with built-in actions
const rule = new RuleBuilder()
  .withId("test")
  .on("EVENT")
  .do("log", { message: "Event received" })
  .do("STATE_INCREMENT", { key: "event_count" })
  .do("forward", { url: "https://api.example.com", method: "POST" })
  .build();

// 2. Save to file
await RuleExporter.saveToFile(rule, "./rules/my-rule.yaml");

// 3. Load from directory
const rules = await TriggerLoader.loadRulesFromDir("./rules");

// 4. Configure persistence (optional)
const persistence = new FileSystemPersistence("./state.json");
StateManager.getInstance().setPersistence(persistence);
await StateManager.getInstance().initialize();

// 5. Initialize extended engine (includes built-in actions, state, observability)
const engine = new RuleEngine({
  rules,
  globalSettings: {
    debugMode: true,
    evaluateAll: true
  }
});

// 6. Process events - both methods available
const results1 = await engine.processEventSimple("USER_LOGIN", { username: "admin" });
// Or with full context:
const results2 = await engine.processEvent({
  event: "USER_LOGIN",
  data: { username: "admin" },
  timestamp: Date.now()
});

// 7. Listen to events (observability)
import { triggerEmitter, EngineEvent } from "trigger_system";
triggerEmitter.on(EngineEvent.RULE_MATCH, ({ rule }) => {
  console.log(`Rule matched: ${rule.id}`);
});
```

### Built-in Actions Available

Both SDKs support these built-in actions:

```typescript
// Logging
.do("log", { message: "Hello ${data.username}" })

// State management
.do("STATE_SET", { key: "user_${data.id}", value: "${data.name}" })
.do("STATE_INCREMENT", { key: "counter", amount: 1 })

// HTTP operations (Node.js)
.do("response", { statusCode: 200, body: "OK" })
.do("forward", { url: "https://api.example.com", method: "POST" })

// Command execution (Node.js only)
.do("execute", { command: "ls -la", safe: true })
```
