# 🛠️ Developer Tools

This guide covers the various tools available to help you build, debug, and maintain your trigger rules.

## CLI Validator

The CLI validator (`src/cli/validate.ts`) checks your rule files for semantic errors and circular dependencies.

### Basic Usage

The `validate` script is pre-configured in `package.json`:

```bash
# Default: Validates rules in ./rules directory
bun run validate

# Custom Directory
bun run src/cli/validate.ts ./my_rules_dir
```

### Validation Output

The validator relies on `TriggerLoader` to parse and validate rules. If `arktype` validation fails, errors are printed to `stderr`.

```bash
$ bun run validate

🔍 Validating Rules in: /abs/path/to/rules
==================================================

[TriggerLoader] ⚠️ Validation Problem in rules/bad.yaml (item #1)
  - [do] actions is required
  - [on] must be a string

📊 Summary:
   - Loaded Rules: 5
   - ⚠️ No valid rules found (or all failed validation).

🔄 Checking for Circular Dependencies...
   - ✅ No cycles found.
```

### Circular Dependency Detection

The validator uses `DependencyAnalyzer` to check if rules form an infinite loop (e.g., A triggers B, B triggers A). This is run automatically during validation.

If a cycle is found:

```bash
❌ Error: Circular Dependencies Detected!
   [Cycle #1] rule-a -> rule-b -> rule-a
```

## VS Code LSP Integration

The Language Server Protocol provides IDE support for trigger rule files.

### Installation

Install the VS Code extension from the marketplace or build it locally:

```bash
cd vscode-extension
npm install
npm run package
code --install-extension trigger-system-*.vsix
```

### Features

#### Syntax Highlighting & Auto-completion

- Event name suggestions
- Operator completion (`EQ`, `GT`, `MATCHES`...)
- Action hints

#### Hover Information

- Field type information
- Rule metadata

### Configuration

Add to your VS Code settings:

```json
{
  "triggerSystem.enableDiagnostics": true,
  "triggerSystem.validation.strict": false
}
```

## Debugging Rules

### Rule Execution Tracing

To debug rules at runtime, you can attach listeners to the `triggerEmitter`.

```typescript
import { RuleEngine, triggerEmitter, EngineEvent } from "trigger_system";

const engine = new RuleEngine({
  rules: [],
  globalSettings: { debugMode: true },
});

// Trace rule execution
triggerEmitter.on(EngineEvent.RULE_MATCH, ({ rule, context }) => {
  console.log(`🎯 Rule matched: ${rule.id} for event: ${context.event}`);
});

triggerEmitter.on(EngineEvent.ACTION_SUCCESS, ({ action, result }) => {
  console.log(`✅ Action executed: ${action.type}`, result);
});

triggerEmitter.on(EngineEvent.ACTION_ERROR, ({ action, error }) => {
  console.error(`❌ Action failed: ${action.type}`, error);
});
```

### Performance Metrics

The engine can collect metrics if you implement a collection system listening to events.

```typescript
// Example custom metrics collector
let processedCount = 0;
let matchCount = 0;

triggerEmitter.on(EngineEvent.ENGINE_DONE, () => {
  processedCount++;
});

triggerEmitter.on(EngineEvent.RULE_MATCH, () => {
  matchCount++;
});

setInterval(() => {
  console.log(`Events: ${processedCount}, Matches: ${matchCount}`);
}, 60000);
```

## Hot Reload

You can implement hot reloading using `TriggerLoader.watchRules`.

```typescript
import { TriggerLoader } from "trigger_system/node";

// Watch returns a FSWatcher
TriggerLoader.watchRules("./rules", (newRules) => {
  console.log("Rules updated!", newRules.length);
  engine.updateRules(newRules);
});
```
