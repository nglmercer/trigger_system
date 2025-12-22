# 📦 SDK Guide

This guide covers programmatic rule creation and management using the TypeScript SDK.

## RuleBuilder - Fluent API

The `RuleBuilder` provides a fluent interface for creating rules programmatically with strict type checking.

### Basic Usage

```typescript
import { RuleBuilder } from "trigger_system/sdk";

const rule = new RuleBuilder()
  .withId("high-value-transaction")
  .on("PAYMENT_RECEIVED")
  .if("data.amount", "GT", 1000)
  .do("send_alert", {
    message: "High value transaction detected: ${data.amount}",
    priority: "high",
  })
  .build();

// The rule is now ready to use
console.log(rule);
```

### Advanced Conditions

```typescript
const complexRule = new RuleBuilder()
  .withId("premium-user-behavior")
  .on("USER_ACTIVITY")
  .if("data.userType", "EQ", "premium")
  .if("data.activityCount", "GT", 10)
  .if("data.lastActivity", "MATCHES", "^2024-.*")
  .do("award_badge", {
    badge: "power_user",
    notification: true,
  })
  .build();
```

### Multiple Actions

```typescript
const multiActionRule = new RuleBuilder()
  .withId("new-user-onboarding")
  .on("USER_REGISTERED")
  .if("data.isFirstTime", "EQ", true)
  .do("send_email", {
    template: "welcome",
    delay: 300000, // 5 minutes
  })
  .do("create_task", {
    type: "follow_up",
    due: "3 days",
  })
  .do("log_event", {
    category: "user_lifecycle",
    action: "registration",
  })
  .build();
```

### Using State

```typescript
const statefulRule = new RuleBuilder()
  .withId("user-streak-tracker")
  .on("DAILY_LOGIN")
  .if("state.consecutive_days", "LT", 7)
  .do("state_increment", {
    field: "consecutive_days",
  })
  .do("check_achievement", {
    milestone: 7,
  })
  .build();
```

## RuleExporter - YAML Generation

Convert programmatically created rules to YAML format.

### Basic Export

```typescript
import { RuleBuilder, RuleExporter } from "trigger_system/sdk";

const rule = new RuleBuilder()
  .withId("example-rule")
  .on("TEST_EVENT")
  .if("data.value", "GT", 50)
  .do("log_message", { message: "Value exceeded threshold" })
  .build();

const yaml = RuleExporter.toYaml(rule);
console.log(yaml);
```

### Export Multiple Rules

```typescript
const rules = [
  new RuleBuilder().withId("rule1").on("EVENT1").do("action1").build(),
  new RuleBuilder().withId("rule2").on("EVENT2").do("action2").build(),
  new RuleBuilder().withId("rule3").on("EVENT3").do("action3").build(),
];

const yaml = RuleExporter.toYaml(rules);
console.log(yaml);
```

### Export to File (Node.js)

```typescript
import { RuleExporter } from "trigger_system/sdk";

// This implicitly uses fs/promises
await RuleExporter.saveToFile(rules, "./rules/generated.yaml");
```

## Server vs Client SDK

The package provided different entry points for optimized bundle sizes.

### Server/Node.js Usage

```typescript
import { RuleEngine } from "trigger_system";
import { TriggerLoader } from "trigger_system/node";

// helper function to init engine
async function initEngine() {
  const rules = await TriggerLoader.loadRulesFromDir("./rules");

  const engine = new RuleEngine({
    rules,
    globalSettings: { debugMode: true },
  });

  return engine;
}
```

### Client/Browser Usage

```typescript
import { RuleEngine } from "trigger_system";
// Client doesn't have TriggerLoader (File System access)

const engine = new RuleEngine({
  rules: [
    /* imported JSON or object rules */
  ],
  globalSettings: { evaluateAll: false },
});

// Or update dynamically
engine.updateRules(fetchedRules);
```

## Advanced SDK Features

### Dynamic Rule Creation

```typescript
class RuleFactory {
  static createThresholdRule(
    event: string,
    field: string,
    threshold: number,
    action: string
  ) {
    return new RuleBuilder()
      .withId(`${event}-${field}-threshold`)
      .on(event)
      .if(field, "GT", threshold)
      .do(action, { threshold, field })
      .build();
  }
}

// Usage
const rules = [
  RuleFactory.createThresholdRule(
    "CPU_USAGE",
    "data.cpu",
    80,
    "alert_high_cpu"
  ),
  RuleFactory.createThresholdRule(
    "MEMORY_USAGE",
    "data.memory",
    90,
    "alert_high_memory"
  ),
];
```

### Validation and Testing

```typescript
import { TriggerValidator } from "trigger_system/domain";
import { RuleBuilder } from "trigger_system/sdk";

const rule = new RuleBuilder().withId("test").build();

// Validate a single rule
const result = TriggerValidator.validate(rule);

if (!result.valid) {
  console.error("Rule validation failed:", result.issues);
} else {
  console.log("Valid rule:", result.rule);
}
```

## Integration Examples

### With Express.js

```typescript
import express from "express";
import { RuleEngine } from "trigger_system";
import { TriggerLoader } from "trigger_system/node";

const app = express();
// Load rules once
const rules = await TriggerLoader.loadRulesFromDir("./rules");
const engine = new RuleEngine({ rules, globalSettings: {} });

app.use(express.json());

// Endpoint to fire events
app.post("/api/events", async (req, res) => {
  const { event, data } = req.body;

  // Fire!
  const results = await engine.processEventSimple(event, data);

  res.json({ status: "processed", results });
});
```
