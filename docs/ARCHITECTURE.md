# 🧩 Architecture

This document describes the internal architecture of the Agnostic Trigger System, including system design, core components, and data flow.

## System Overview

The Agnostic Trigger System is built with a modular architecture that separates concerns into distinct layers:

```text
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │   Express   │  │  WebSocket  │  │    CLI      │       │
│  │    App      │  │   Server    │  │   Tools     │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────┐
│         ▼                 ▼                 ▼               │
│                 SDK Layer (Public API)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ RuleBuilder │  │RuleExporter │  │ RuleEngine  │       │
│  │             │  │             │  │             │       │
│  └─────────────┘  └─────────────┘  └──────┬──────┘       │
│                                             │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
┌─────────────────────────────────────────────┼───────────────┐
│                         ▼                   │               │
│                 Core Engine Layer             │               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────┴──────┐       │
│  │TriggerLoader│  │Expression   │  │Action       │       │
│  │(Static)     │  │Engine       │  │Registry     │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                 │                 │               │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐       │
│  │StateManager │  │Dependency   │  │trigger      │       │
│  │             │  │Analyzer     │  │Emitter      │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────┐
│         ▼                 ▼                 ▼               │
│                Infrastructure Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │Persistence  │  │Node/Browser │  │ArkType      │       │
│  │Adapters     │  │IO           │  │Validator    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. RuleEngine

The central orchestrator that coordinates all other components.

**Responsibilities:**

- Context evaluation
- Rule matching logic
- Coordination of action execution logic

**Key Methods:**

- `processEvent(data)` - Main entry point (with vars)
- `processEventSimple(event, data)` - Main entry point (no vars)
- `evaluateContext(context)` - Core evaluation loop
- `updateRules(rules)` - Hot swap rules

### 2. TriggerLoader (Node.js)

A static utility class responsible for loading and validating rules from the file system.

**Features:**

- YAML/JSON parsing
- Directory walking
- File watching (`watchRules`)
- Integration with `TriggerValidator`

### 3. ExpressionEngine

Static utility that evaluates conditions and interpolated strings.

**Capabilities:**

- Nested field access (`data.user.id`)
- Variable interpolation (`${data.value}`)
- Condition Operator logic (`EQ`, `GT`, `MATCHES`...)

### 4. ActionRegistry

Singleton registry that maps action types strings (e.g., "send_email") to handler functions.

**Features:**

- Global registration
- Handler lookup
- Default handlers

### 5. StateManager

Singleton that holds the current state of the application for stateful rules.

**Capabilities:**

- In-memory state storage
- Persistence layer integration (load/save)
- Global state access

### 6. DependencyAnalyzer

Static analysis tool to detect cycles and dependencies between rules (based on state keys read/written).

### 7. triggerEmitter

Global Event Emitter for observability. Emits events like `rule:match`, `action:success`, `engine:start`.

## Data Flow

### Event Processing Flow

```text
Event Fired (processEvent)
    │
    ▼
┌─────────────────┐
│  Context Setup  │
│  - User Data    │
│  - Vars      │
│  - Current State│
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Rule Matching   │
│  - Filter (on)  │
│  - Cooldown     │
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Condition       │
│ Evaluation      │
│  - Expression   │
│    Engine       │
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Action          │
│ Execution       │
│  - Registry     │
│  - Handlers     │
└────────┬────────┘
         │
    ▼
┌─────────────────┐
│ Events Emitted  │
│  - rule:match   │
│  - action:done  │
└─────────────────┘
```

## State Management

State is managed via the `StateManager` singleton and accessed in rules.

1. **Initialization**: State loaded from persistence provider.
2. **Access**: Rules read state via `state.*` paths.
3. **Modification**: Rules allow `state_set`, `state_increment` actions (or custom logic).
4. **Persistence**: `FilePersistence` or `BrowserPersistence` saves state changes.

## Performance Considerations

1. **Rule Indexing**: Rules are sorted by priority.
2. **Lazy Evaluation**: `OR` conditions short-circuit.
3. **Regex Compilation**: `ExpressionEngine` creates RegEx objects on the fly (consider caching for high volume).

## Security Considerations

### Input Validation

- `TriggerValidator` uses `ArkType` to strictly validate rule schemas at load time.
- Runtime data is treated as untrusted and accessed safely via `ExpressionEngine`.

### Access Control

- Action Handlers are the boundary. Ensure your action handlers validate inputs/permissions before performing sensitive operations (DB writes, API calls).
