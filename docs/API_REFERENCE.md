# 📖 API Reference

Complete technical documentation for all classes, interfaces, and types in the Agnostic Trigger System.

## Core Classes

### RuleEngine

The main engine that processes events and executes rules.

```typescript
import { RuleEngine, RuleEngineConfig } from "trigger_system";

class RuleEngine {
  constructor(config: RuleEngineConfig);

  // Event Processing
  processEventSimple(
    eventType: string,
    data?: Record<string, unknown>,
    globals?: Record<string, unknown>
  ): Promise<TriggerResult[]>;
  processEvent(
    event: TriggerEvent,
    globals?: Record<string, unknown>
  ): Promise<TriggerResult[]>;
  evaluateContext(context: TriggerContext): Promise<TriggerResult[]>;

  // Rule Management
  updateRules(newRules: TriggerRule[]): void;
  getRules(): TriggerRule[];
}
```

#### RuleEngineConfig

```typescript
interface RuleEngineConfig {
  rules: TriggerRule[];
  globalSettings: GlobalSettings;
}

interface GlobalSettings {
  debugMode?: boolean;
  evaluateAll?: boolean; // If true, continue checking rules after a match
  strictActions?: boolean; // If true, throw error on unknown actions
}
```

### TriggerLoader (Node.js/Bun Only)

A static utility class for loading rules from the file system.

```typescript
import { TriggerLoader } from "trigger_system/node";

class TriggerLoader {
  // Load all .yaml files from a directory (recursive)
  static loadRulesFromDir(dirPath: string): Promise<TriggerRule[]>;

  // Load logic from a single file
  static loadRule(filePath: string): Promise<TriggerRule[]>;

  // Watch a directory for changes and reload rules
  static watchRules(
    dirPath: string,
    onUpdate: (rules: TriggerRule[]) => void
  ): FSWatcher;
}
```

## Types and Interfaces

### TriggerRule

The primary data structure representing a business logic rule.

```typescript
interface TriggerRule extends RuleMetadata {
  on: string; // Event name to listen for
  if?: RuleCondition | RuleCondition[]; // Condition(s) to evaluate
  do: Action | Action[] | ActionGroup; // Action(s) to execute
}

interface RuleMetadata {
  id: string;
  name?: string;
  description?: string;
  priority?: number; // Higher number = Higher priority
  enabled?: boolean;
  cooldown?: number; // Milliseconds
  tags?: string[];
}
```

### Condition

Conditions are used to evaluate whether a rule should fire.

```typescript
type RuleCondition = Condition | ConditionGroup;

interface Condition {
  field: string; // Dot-notation path (e.g., "data.user.id")
  operator: ComparisonOperator;
  value: ConditionValue; // Value to compare against
}

interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: (Condition | ConditionGroup)[];
}

type ComparisonOperator =
  | "EQ"
  | "=="
  | "NEQ"
  | "!="
  | "GT"
  | ">"
  | "GTE"
  | ">="
  | "LT"
  | "<"
  | "LTE"
  | "<="
  | "IN"
  | "NOT_IN"
  | "CONTAINS"
  | "MATCHES"
  | "SINCE"
  | "AFTER"
  | "BEFORE"
  | "UNTIL"
  | "RANGE";
```

### Action

Actions define what happens when a rule matches.

```typescript
interface Action {
  type: string; // Action identifier (e.g., "send_email")
  params?: ActionParams; // Key-value parameters
  delay?: number; // Execution delay in ms
  probability?: number; // 0.0 to 1.0
}

interface ActionGroup {
  mode: "ALL" | "EITHER" | "SEQUENCE";
  actions: Action[];
}
```

### TriggerContext

The context object passed through the engine during evaluation.

```typescript
interface TriggerContext {
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
  globals?: Record<string, unknown>;
  state?: Record<string, unknown>;
  id?: string;
}
```

### TriggerResult

The outcome of a rule processing cycle.

```typescript
interface TriggerResult {
  ruleId: string;
  success: boolean;
  executedActions: ExecutedAction[];
  error?: Error;
}

interface ExecutedAction {
  type: string;
  result?: unknown;
  error?: unknown;
  timestamp: number;
  skipped?: string;
}
```

## SDK Classes

Helper classes for building and exporting rules programmatically.

### RuleBuilder

A fluent builder for creating strict TypeScript rules.

```typescript
import { RuleBuilder } from "trigger_system/sdk";

class RuleBuilder {
  constructor();

  // Metadata
  withId(id: string): this;
  withName(name: string): this;
  withDescription(desc: string): this;
  withPriority(p: number): this;
  withCooldown(ms: number): this;
  withTags(tags: string[]): this;

  // Trigger
  on(event: string): this;

  // Conditions
  if(field: string, op: ComparisonOperator, value: any): this;

  // Complex Conditions (Groups)
  ifComplex(sub: (b: ConditionBuilder) => ConditionBuilder): this;

  // Actions
  do(
    type: string,
    params?: ActionParams,
    options?: { delay?: number; probability?: number }
  ): this;

  // Complex Actions (Groups/Sequences)
  doComplex(sub: (b: ActionBuilder) => ActionBuilder): this;

  // Finalize
  build(): TriggerRule;
}
```

### RuleExporter

Utilities for converting rules to standard formats.

```typescript
import { RuleExporter } from "trigger_system/sdk";

class RuleExporter {
  static toYaml(rule: TriggerRule | TriggerRule[]): string;

  // Node.js only
  static saveToFile(
    rules: TriggerRule | TriggerRule[],
    path: string
  ): Promise<void>;
}
```

## Observability

The system uses a global event emitter for tracking execution flow.

```typescript
import { triggerEmitter, EngineEvent } from 'trigger_system';

// Events
triggerEmitter.on(EngineEvent.RULE_MATCH, ({ rule, context }) => { ... });
triggerEmitter.on(EngineEvent.ACTION_SUCCESS, ({ action, result }) => { ... });
triggerEmitter.on(EngineEvent.ACTION_ERROR, ({ action, error }) => { ... });

// Event Types enum
enum EngineEvent {
  ENGINE_START = 'engine:start',
  ENGINE_DONE = 'engine:done',
  RULE_MATCH = 'rule:match',
  ACTION_SUCCESS = 'action:success',
  ACTION_ERROR = 'action:error',
  // ...
}
```

## Error Handling

### Validation Errors

Occur when loading rules that don't match the schema. These are typically logged to stderr by the `TriggerLoader`.

### Execution Errors

Occur during `processEvent`. They do not stop the engine unless uncaught. They are reported in `TriggerResult.error` and via `triggerEmitter`.
