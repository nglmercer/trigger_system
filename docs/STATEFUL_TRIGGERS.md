# Stateful Triggers & Dynamic Logic

The Trigger System now supports **Stateful Logic**, allowing you to create complex behaviors like Repetition (Goals), Combos (Sequences), and Dynamic Counters.

## Core Concept: State Manager

The `StateManager` maintains a global, mutable state map that persists across event executions. This state is injected into every `TriggerContext` as `state`.

### Accessing State

In conditions, you can access state variables using `state.your_variable_name`.

```yaml
if:
  field: "state.click_count"
  operator: "GT"
  value: 5
```

### Modifying State

You can modify state using built-in actions:

| Action Type       | Params          | Description                                             |
| :---------------- | :-------------- | :------------------------------------------------------ |
| `STATE_SET`       | `key`, `value`  | Sets a variable. Value can be dynamic (`${data.prop}`). |
| `STATE_INCREMENT` | `key`, `amount` | Increments a number. Default amount is 1.               |
| `STATE_DECREMENT` | `key`, `amount` | Decrements a number. Default amount is 1.               |

### StateManager API

The StateManager is a singleton with additional methods:

```typescript
// Get single value
StateManager.getInstance().get(key: string): any

// Set value with persistence
StateManager.getInstance().set(key: string, value: any): Promise<void>

// Increment/decrement
StateManager.getInstance().increment(key: string, amount?: number): Promise<number>
StateManager.getInstance().decrement(key: string, amount?: number): Promise<number>

// Delete single key
StateManager.getInstance().delete(key: string): Promise<boolean>

// Clear all state
StateManager.getInstance().clear(): Promise<void>

// Get all state as object
StateManager.getInstance().getAll(): Record<string, any>
```

## Examples

### 1. Repetition Goal (e.g. "On 3rd Click")

Trigger an action only after an event has happened X times.

#### **Rule 1: Increment Counter**

```yaml
id: "count-clicks"
on: "CLICK_EVENT"
do:
  type: "STATE_INCREMENT"
  params:
    key: "clicks"
```

#### **Rule 2: Check Goal**

```yaml
id: "goal-reached"
on: "CLICK_EVENT"
priority: 0 # Run after increment (optional, depending on logic preference)
if:
  field: "state.clicks"
  operator: "EQ"
  value: 3
do:
  type: "log"
  params:
    message: "You clicked 3 times!"
```

### 2. Combo Sequence (A then B)

Trigger only if Event A happened, then Event B happens.

#### **Rule A: Set Flag**

```yaml
id: "step-1"
on: "EVENT_A"
do:
  type: "STATE_SET"
  params:
    key: "last_step"
    value: "A"
```

#### **Rule B: Check Flag**

```yaml
id: "step-2"
on: "EVENT_B"
if:
  field: "state.last_step"
  operator: "EQ"
  value: "A"
do:
  - type: "log"
    params: { message: "COMBO!" }
  - type: "STATE_SET"
    params: { key: "last_step", value: "B" } # Reset or advance
```

## Persistence Configuration

The StateManager supports pluggable persistence adapters:

```typescript
import { StateManager, FileSystemPersistence } from "trigger_system/node";

// Use file system persistence instead of in-memory
const persistence = new FileSystemPersistence("./state.json");
StateManager.getInstance().setPersistence(persistence);
await StateManager.getInstance().initialize();
```

Built-in adapters:
- `InMemoryPersistence` (default)
- `FileSystemPersistence` (Node.js only)

## Future Improvements

- **Database Persistence**: Redis, SQLite, PostgreSQL adapters
- **TTL Support**: State expiration (e.g. "3 clicks _within 10 seconds_")
- **State Namespacing**: Isolate state by rule groups or contexts
