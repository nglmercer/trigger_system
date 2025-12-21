# API Reference

## Types (`src/types.ts`)

### `TriggerRule`

The core definition of a logic unit.

| Field      | Type                                | Description                                 |
| :--------- | :---------------------------------- | :------------------------------------------ |
| `id`       | `string`                            | Unique identifier for the rule.             |
| `on`       | `string`                            | The Event Name to listen for.               |
| `if`       | `RuleCondition \| RuleCondition[]`  | Conditions to check. Implicit AND if array. |
| `do`       | `Action \| Action[] \| ActionGroup` | Actions to execute if conditions pass.      |
| `priority` | `number`                            | Higher number = executed first.             |

### `Condition`

Defines a check against the context.

```typescript
interface Condition {
  field: string; // Dot-notation path (e.g., "data.user.id")
  operator: ComparisonOperator;
  value: any; // Static value or dynamic "${data.prop}"
}
```

Supported Operators: `EQ`, `NEQ`, `GT`, `LT`, `IN`, `CONTAINS`, `MATCHES`, `SINCE`, etc.

### `Action`

Defines an operation to perform.

```typescript
interface Action {
  type: string; // Registered action name
  params?: Record<string, any>;
  delay?: number; // Milliseconds
}
```

---

## Core Classes

### `RuleEngine`

The main processor.

**Constructor:**
`new RuleEngine(config: RuleEngineConfig)`

**Methods:**

- `registerAction(type: string, handler: ActionHandler)`: Register a custom action.
- `processEvent(context: TriggerContext): Promise<TriggerResult[]>`: Evaluate rules for an event.

### `TriggerLoader`

Helper to load rules from the filesystem.

**Constructor:**
`new TriggerLoader(rulesDir: string)`

**Methods:**

- `loadRules(): Promise<TriggerRule[]>`: Scans directory for YAML rules.
- `watchRules(callback: (rules: TriggerRule[]) => void)`: Hot-reloads rules on file changes.

### `StateManager`

Manages persistence and stateful logic.

**Methods:**

- `getState(key: string): any`
- `setState(key: string, value: any)`
- `increment(key: string, amount: number)`
