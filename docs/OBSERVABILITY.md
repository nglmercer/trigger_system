# 👁️ Observability & Events

The Trigger System includes a built-in `triggerEmitter` that allows you to observe engine execution in real-time. This is useful for logging, debugging, or building UI dashboards that react to rule execution.

## Usage

The emitter is a singleton instance exported from the main package.

```typescript
import { triggerEmitter, EngineEvent } from "trigger_system";

// Listen for rule matches
triggerEmitter.on(EngineEvent.RULE_MATCH, ({ rule, context }) => {
  console.log(`Rule "${rule.id}" was triggered by event "${context.event}"`);
});

// Listen for action results
triggerEmitter.on(EngineEvent.ACTION_SUCCESS, ({ action, result }) => {
  console.log(`Action ${action.type} completed successfully`);
});

// Listen for errors
triggerEmitter.on(EngineEvent.ACTION_ERROR, ({ action, error }) => {
  console.error(`Action ${action.type} failed: ${error}`);
});
```

## Available Events (EngineEvent Enum)

| Enum Constant                | Raw String Value | Data Description                                                                                                          |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `EngineEvent.ENGINE_START`   | `engine:start`   | `{ context: TriggerContext, rulesCount: number }` - Fired when evaluation starts.                                         |
| `EngineEvent.RULE_MATCH`     | `rule:match`     | `{ rule: TriggerRule, context: TriggerContext }` - Fired when a rule's conditions are met.                                |
| `EngineEvent.ACTION_SUCCESS` | `action:success` | `{ action: Action, context: TriggerContext, result: any }` - Fired after an action executes successfully.                 |
| `EngineEvent.ACTION_ERROR`   | `action:error`   | `{ action: Action, context: TriggerContext, error: string }` - Fired if an action handler throws an error.                |
| `EngineEvent.ENGINE_DONE`    | `engine:done`    | `{ results: TriggerResult[], context: TriggerContext }` - Fired after all matching rules and actions have been processed. |

## Why use an Emitter?

1. **Decoupling**: Your business logic doesn't need to know about logging or monitoring.
2. **Audit Logs**: Easily pipe all `action:success` events to a database or external logging service.
3. **Real-time Feedback**: In a UI (like a playground), you can show which rules are firing as the user interacts with the system.
4. **Integration**: Connect the engine to other systems (e.g., notify a Slack channel whenever a specific high-priority rule matches).

## Example Observer

In our examples, we use a shared observer to display standardized logs:

```typescript
import { triggerEmitter, EngineEvent } from "trigger_system";

triggerEmitter.on(EngineEvent.ENGINE_START, ({ context }) => {
  console.log(`Evaluating event: ${context.event}`);
});
```
