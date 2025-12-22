# API Reference

## Types (`src/types.ts`)

### `RuleMetadata`

Base metadata for rules.

| Field       | Type      | Description                                           |
| :---------- | :-------- | :---------------------------------------------------- |
| `id`        | `string`  | Unique identifier for the rule.                       |
| `name`      | `string?` | Optional human-readable name.                         |
| `description`| `string?`| Optional description.                                 |
| `priority`  | `number?` | Higher number = executed first (default: 0).         |
| `enabled`   | `boolean?`| Enable/disable rule (default: true).                 |
| `cooldown`  | `number?` | Milliseconds to wait before re-triggering.           |
| `tags`      | `string[]?`| Array of tags for categorization.                   |

### `TriggerRule`

The core definition of a logic unit, extends RuleMetadata.

| Field      | Type                                | Description                                 |
| :--------- | :---------------------------------- | :------------------------------------------ |
| `on`       | `string`                            | The Event Name to listen for.               |
| `if`       | `RuleCondition \| RuleCondition[]`  | Conditions to check. Implicit AND if array. |
| `do`       | `Action \| Action[] \| ActionGroup` | Actions to execute if conditions pass.      |

### `Condition`

Defines a check against the context.

```typescript
interface Condition {
  field: string; // Dot-notation path (e.g., "data.user.id")
  operator: ComparisonOperator;
  value: any; // Static value or dynamic "${data.prop}"
}
```

Supported Operators:
- `EQ` | `==` - Equal
- `NEQ` | `!=` - Not Equal
- `GT` | `>` - Greater Than
- `GTE` | `>=` - Greater Than or Equal
- `LT` | `<` - Less Than
- `LTE` | `<=` - Less Than or Equal
- `IN` - Value in Array
- `NOT_IN` - Value not in Array
- `CONTAINS` - String/Array contains
- `MATCHES` - Regex match
- `SINCE` | `AFTER` - Date >= Value
- `BEFORE` | `UNTIL` - Date < Value
- `RANGE` - Number in range [min, max]

### `Action`

Defines an operation to perform.

```typescript
interface Action {
  type: string; // Registered action name
  params?: Record<string, any>;
  delay?: number; // Milliseconds
  probability?: number; // 0-1 probability of execution (for randomized behaviors)
}
```

### `ExecutionMode`

Modes for action group execution:
- `ALL` - Execute all actions (Default)
- `EITHER` - Execute exactly one action randomly
- `SEQUENCE` - Execute in order, waiting for previous to complete

---

## Core Classes

### `TriggerEngine` (Base)

Platform-agnostic base engine with core functionality.

**Constructor:**
`new TriggerEngine(rules: TriggerRule[] | RuleEngineConfig)`

**Methods:**

- `registerAction(type: string, handler: EngineActionHandler)`: Register a custom action.
- `processEvent(context: TriggerContext): Promise<TriggerResult[]>`: Evaluate rules for an event.
- `processEventSimple(eventType: string, data?: Record<string, any>, globals?: Record<string, any>): Promise<TriggerResult[]>`: Convenience method for simple events.
- `updateRules(newRules: TriggerRule[])`: Update rules at runtime.
- `getRules(): TriggerRule[]`: Get current rules.

**Features:**
- Platform-agnostic (works in browser and Node.js)
- Basic action handling through registered handlers
- Core condition evaluation
- Cooldown management
- Extensible design

### `RuleEngine` (Extension)

Extends TriggerEngine with advanced features (observability, state management, etc.).

**Constructor:**
`new RuleEngine(config: RuleEngineConfig)`

**Methods:** (Inherits all from TriggerEngine, plus:)

- Automatic integration with ActionRegistry
- Automatic state management injection
- Event emission for observability
- Enhanced error handling

**Features:**
- All TriggerEngine features
- Built-in action registry integration
- StateManager integration
- Event emitter integration
- Enhanced configuration options

### `TriggerLoader`

Helper to load rules from the filesystem.

**Constructor:**
`new TriggerLoader(rulesDir: string)`

**Methods:**

- `loadRules(): Promise<TriggerRule[]>`: Scans directory for YAML rules.
- `watchRules(callback: (rules: TriggerRule[]) => void)`: Hot-reloads rules on file changes.

### `ActionRegistry`

Singleton registry for action handlers with built-in actions.

**Built-in Actions:**
- `log` - Logging with template interpolation
- `response` - HTTP response generation
- `execute` - Command execution (Node.js only)
- `forward` - HTTP request forwarding
- `STATE_SET` - Set state variable
- `STATE_INCREMENT` - Increment state counter
- `EMIT_EVENT` - Emit new events

### `StateManager`

Singleton that manages persistence and stateful logic.

**Methods:**

- `get(key: string): any` - Get state value
- `set(key: string, value: any): Promise<void>` - Set state value
- `increment(key: string, amount: number): Promise<number>` - Increment numeric value
- `decrement(key: string, amount: number): Promise<number>` - Decrement numeric value
- `delete(key: string): Promise<boolean>` - Delete state key
- `clear(): Promise<void>` - Clear all state
- `getAll(): Record<string, any>` - Get all state as object
