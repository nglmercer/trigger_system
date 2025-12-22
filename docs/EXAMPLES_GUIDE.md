# 💡 Step-by-Step Examples

This guide provides progressive tutorials to help you learn the Agnostic Trigger System through practical examples.

## 1.0 Basic Rule

Let's start with the simplest possible rule.

### The Rule

Create `rules/welcome.yaml`:

```yaml
- id: "welcome-new-user"
  on: "USER_REGISTERED"
  do:
    type: "log_message"
    params:
      message: "New user registered: ${data.userId}"
```

### Testing the Rule

```typescript
import { RuleEngine } from "trigger_system";
import { TriggerLoader } from "trigger_system/node";

const rules = await TriggerLoader.loadRulesFromDir("./rules");
const engine = new RuleEngine({ rules, globalSettings: {} });

// Fire the event
await engine.processEvent("USER_REGISTERED", {
  userId: "user123",
  email: "user@example.com",
});

// Output: "New user registered: user123"
```

### What We Learned

- Rules listen for specific events (`on: "USER_REGISTERED"`)
- Actions are executed when events fire (`do: "log_message"`)
- Data is accessible via `${data.fieldName}` syntax

## 1.1 Multiple Conditions

Now let's add conditions to make our rules more selective.

### Simple Condition

```yaml
- id: "welcome-premium-user"
  on: "USER_REGISTERED"
  if:
    field: "data.plan"
    operator: "EQ"
    value: "premium"
  do:
    type: "log_message"
    params:
      message: "Premium user registered: ${data.userId}"
```

### Multiple Conditions

```yaml
- id: "high-value-transaction"
  on: "TRANSACTION_PROCESSED"
  if:
    operator: "AND"
    conditions:
      - field: "data.amount"
        operator: "GT"
        value: 1000
      - field: "data.currency"
        operator: "EQ"
        value: "USD"
      - field: "data.status"
        operator: "EQ"
        value: "completed"
  do:
    type: "send_alert"
    params:
      message: "High value transaction: $${data.amount}"
      priority: "high"
```

### OR Conditions

```yaml
- id: "important-user-activity"
  on: "USER_ACTIVITY"
  if:
    operator: "OR"
    conditions:
      - field: "data.userType"
        operator: "EQ"
        value: "premium"
      - field: "data.vipStatus"
        operator: "EQ"
        value: true
      - field: "data.accountAge"
        operator: "LT"
        value: 7 # New users (less than 7 days)
  do:
    type: "track_activity"
    params:
      userId: "${data.userId}"
      priority: "high"
```

### Complex Logic

```yaml
- id: "fraud-detection"
  on: "TRANSACTION_INITIATED"
  if:
    operator: "AND"
    conditions:
      - operator: "OR"
        conditions:
          - field: "data.amount"
            operator: "GT"
            value: 5000
          - field: "data.foreignTransaction"
            operator: "EQ"
            value: true
      - field: "data.userAccountAge"
        operator: "LT"
        value: 30
  do:
    type: "flag_for_review"
    params:
      transactionId: "${data.transactionId}"
      reason: "potential_fraud"
```

## 1.2 Advanced Operators

Explore the full range of comparison operators.

### String Operations

```yaml
- id: "email-validation"
  on: "USER_REGISTERED"
  if:
    field: "data.email"
    operator: "MATCHES"
    value: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  do:
    type: "mark_email_valid"
    params:
      userId: "${data.userId}"
```

### Array Operations

```yaml
- id: "admin-privileges"
  on: "PERMISSION_CHECK"
  if:
    field: "data.userRole"
    operator: "IN"
    value: ["admin", "moderator", "superuser"]
  do:
    type: "grant_admin_access"
    params:
      userId: "${data.userId}"
```

### Existence Checks

Existence checks are handled via nullable checks or custom functions, or implicitly if a field is missing it might return null/undefined which EQ null can check, but explicit `NOT_EXISTS` is better handled by your custom expression logic or by checking against null if supported.

_Note: NOT_EXISTS / EXISTS operators are not in the core set but can be emulated or added via plugins._

## 1.3 Stateful Counters

Learn to use state to track information across multiple events.

### Simple Counter

```yaml
- id: "login-attempt-counter"
  on: "LOGIN_ATTEMPT"
  do:
    - type: "state_increment"
      params:
        key: "login_attempts.${data.userId}"
    - type: "log_message"
      params:
        message: "Login attempt ${state.login_attempts.${data.userId}} for user ${data.userId}"
```

## 1.4 Action Groups

Execute multiple actions in sequence.

### Basic Multi-Action

```yaml
- id: "user-onboarding"
  on: "USER_REGISTERED"
  do:
    - type: "log_event"
      params:
        event: "user_registration"
        userId: "${data.userId}"
    - type: "create_user_profile"
      params:
        userId: "${data.userId}"
        email: "${data.email}"
```

## 2.0 SDK Usage

Create rules programmatically using the TypeScript SDK.

### Basic Rule Builder

```typescript
import { RuleBuilder } from "trigger_system/sdk";

// Create a simple rule
const welcomeRule = new RuleBuilder()
  .withId("sdk-welcome-rule")
  .on("USER_REGISTERED")
  .if("data.plan", "EQ", "premium")
  .do("send_email", {
    template: "welcome_premium",
    subject: "Welcome to Premium!",
  })
  .build();

console.log(welcomeRule);
```

### Complex Rule with SDK

```typescript
const complexRule = new RuleBuilder()
  .withId("sdk-fraud-detection")
  .on("TRANSACTION_INITIATED")
  .if("data.amount", "GT", 1000)
  .if("data.userAccountAge", "LT", 30)
  .if("data.foreignTransaction", "EQ", true)
  .do("flag_for_review", {
    reason: "potential_fraud",
    priority: "high",
  })
  .do("send_alert", {
    channels: ["email", "slack"],
    severity: "warning",
  })
  .withTags(["fraud", "security"])
  .build();
```

### Dynamic Rule Generation

```typescript
function createThresholdRule(
  eventType: string,
  field: string,
  threshold: number,
  actionType: string
) {
  return new RuleBuilder()
    .withId(`${eventType}-${field}-threshold`)
    .on(eventType)
    .if(field, "GT", threshold)
    .do(actionType, {
      threshold,
      field,
      eventType,
    })
    .build();
}

// Generate multiple rules
const rules = [
  createThresholdRule("CPU_USAGE", "data.cpu", 80, "alert_high_cpu"),
  createThresholdRule("MEMORY_USAGE", "data.memory", 90, "alert_high_memory"),
];
```

### Export to YAML

```typescript
import { RuleExporter } from "trigger_system/sdk";

// Export single rule
const yaml = RuleExporter.toYaml(welcomeRule);
console.log(yaml);

// Save to file (Node.js)
await RuleExporter.saveToFile(
  [welcomeRule, complexRule],
  "./rules/generated.yaml"
);
```

## Best Practices from Examples

### 1. Start Simple

Begin with basic rules and gradually add complexity.

### 2. Use Descriptive Names

`id: "high-value-transaction-alert"` vs `id: "rule1"`.

### 3. Handle Errors Gracefully

Ensure your custom action handlers interpret errors correctly or use `.catch()` in your async action logic.
