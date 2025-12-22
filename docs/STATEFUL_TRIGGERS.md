# ⚡ Stateful Triggers

This guide covers advanced rule logic using stateful triggers, including counters, sequences, and complex state management.

## Understanding State

State allows rules to remember information across multiple executions, enabling complex behaviors like counting, tracking sequences, and maintaining user sessions.

### State Basics

```yaml
# Simple counter example
id: "login-counter"
on: "USER_LOGIN"
if:
  field: "state.login_count"
  operator: "LT"
  value: 5
do:
  - type: "state_increment"
    params:
      key: "login_count"
  - type: "log"
    params:
      message: "Login ${state.login_count} of 5"
```

## State Operations

### STATE_SET - Set State Value

```yaml
id: "set-user-preference"
on: "PREFERENCE_UPDATED"
do:
  type: "state_set"
  params:
    key: "user_preferences.${data.userId}.${data.preference}"
    value: "${data.value}"
```

### STATE_INCREMENT - Increment Counter

```yaml
id: "page-view-counter"
on: "PAGE_VIEWED"
do:
  type: "state_increment"
  params:
    key: "page_views.${data.pageId}"
    amount: 1 # Optional, defaults to 1
```

### STATE_TOGGLE - Toggle Boolean

_Note: STATE_TOGGLE needs to be implemented as a custom action or logic if not built-in, or use state_set with negation expression._

```yaml
id: "feature-toggle"
on: "FEATURE_FLAG_REQUESTED"
do:
  type: "state_set"
  params:
    key: "features.${data.featureName}"
    value: "${!state.features[data.featureName]}"
```

### STATE_CLEAR - Remove State

_Note: Use state_set with null/undefined to clear or delete._

```yaml
id: "session-cleanup"
on: "USER_LOGOUT"
do:
  type: "state_set"
  params:
    key: "session.${data.userId}"
    value: null
```

## Advanced Patterns

### Repetition Goals

Track when something happens a specific number of times:

```yaml
id: "daily-task-completion"
on: "TASK_COMPLETED"
if:
  field: "state.daily_tasks.${data.userId}"
  operator: "LT"
  value: 3
do:
  - type: "state_increment"
    params:
      key: "daily_tasks.${data.userId}"
  - type: "check_daily_goal"
    params:
      userId: "${data.userId}"
      current: "${state.daily_tasks.${data.userId}}"
      target: 3
```

### Combo Sequences

Track sequences of events:

```yaml
# First step in sequence
id: "combo-step-1"
on: "ACTION_A"
do:
  type: "state_set"
  params:
    key: "combo.${data.userId}.sequence"
    value: "step1"

# Second step in sequence
id: "combo-step-2"
on: "ACTION_B"
if:
  field: "state.combo.${data.userId}.sequence"
  operator: "EQ"
  value: "step1"
do:
  type: "state_set"
  params:
    key: "combo.${data.userId}.sequence"
    value: "step2"
```

### Time-based State

Track state with time windows:

```yaml
id: "hourly-rate-limit"
on: "API_REQUEST"
if:
  operator: "AND"
  conditions:
    - field: "state.api_calls.${data.userId}"
      operator: "LT"
      value: 100
    - field: "state.api_window.${data.userId}"
      operator: "MATCHES"
      value: "^${utils.currentHour()}"
do:
  - type: "state_increment"
    params:
      key: "api_calls.${data.userId}"
  - type: "state_set"
    params:
      key: "api_window.${data.userId}"
      value: "${utils.currentHour()}"

# Reset hourly counter
id: "hourly-reset"
on: "HOURLY_TICK"
do:
  type: "state_set"
  params:
    key: "api_calls"
    value: {}
```

## State Namespacing

### User-specific State

```yaml
id: "user-progress-tracker"
on: "LEVEL_COMPLETED"
do:
  - type: "state_increment"
    params:
      key: "user.${data.userId}.level"
  - type: "state_set"
    params:
      key: "user.${data.userId}.last_level"
      value: "${data.levelId}"
```

## State Persistence

### Automatic Persistence

State is managed by `StateManager`.

```typescript
import { StateManager } from "trigger_system/core";
import { FilePersistence } from "trigger_system/node";

const manager = StateManager.getInstance();
manager.setPersistence(new FilePersistence("./state"));

await manager.load();
```

## State Best Practices

### 1. Use Descriptive Keys

```yaml
# Good
key: "user.${data.userId}.daily_login_count"

# Avoid
key: "ulc.${data.uid}"
```

### 2. Clean Up Old State

Periodically clear data that is no longer needed to prevent state bloat.

### 3. Handle Race Conditions

While `state_increment` is atomic within the engine's event loop for a single firing, be careful with complex read-modify-write patterns if events originate rapidly.

### 4. Monitor State Size

Keep keys short and values concise.
