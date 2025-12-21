# Trigger System Roadmap & Implementation Status

## 1. System Overview

The Trigger System is a generic, rule-based execution engine designed to handle event-driven automated workflows. It allows defining "Triggers" that listen for events, check conditions ("Rules"), and execute "Actions".

**Key Technologies:**

- **Runtime:** Bun
- **Validation:** ArkType (Optimized, recursive schema validation)
- **Configuration:** YAML / JSON
- **Parsing:** Custom Expression Engine

## 2. Implementation Status

### Core Components

| Component             | Status    | Description                                                                  |
| --------------------- | --------- | ---------------------------------------------------------------------------- |
| **Validator**         | 🟢 Stable | `src/domain/validator.ts`. Uses ArkType. Handles recursive conditions.       |
| **Type Definitions**  | 🟢 Stable | `src/types.ts`. Fully typed `TriggerRule`, `Action`, `Condition`.            |
| **Expression Engine** | 🟢 Stable | `src/core/expression-engine.ts`. Supports Math, Regex, Dates, interpolation. |
| **Rule Engine**       | 🟢 Stable | `src/core/rule-engine.ts`. Orchestrates matching. Supports Action Registry.  |
| **File Loader**       | 🟢 Stable | `src/io/loader.ts`. Supports `watchRules` for hot-reloading.                 |
| **Context Adapter**   | 🟢 Stable | `src/core/context-adapter.ts`. standardizes event payloads.                  |

### Features

| Feature                    | Status  | Notes                                                        |
| -------------------------- | ------- | ------------------------------------------------------------ |
| **Recursive Groups**       | ✅ Done | AND/OR groups can be nested infinitely.                      |
| **Action Modes**           | ✅ Done | SEQUENCE, ALL, EITHER (Random).                              |
| **Validation Suggestions** | ✅ Done | "Did you mean..?" hints for YAML errors.                     |
| **Dynamic Values**         | ✅ Done | Compare field against variables (e.g. `"${globals.limit}"`). |
| **Date/Regex Ops**         | ✅ Done | `SINCE`, `BEFORE`, `MATCHES` operators supported.            |
| **Extensible Actions**     | ✅ Done | `ActionRegistry` allows custom action handlers.              |

## 3. Immediate Priorities ("Make it Better")

### A. Agnostic Design Refinement

- [x] **Context Adapters**: Create standard adapters to normalize external events into `TriggerContext`.
- [x] **Action Registry**: A dynamic way to register action handlers.

### B. Stateful & Dynamic Logic (Goals, Repetition)

- [x] **State Manager**: In-memory store for counters, flags, and sequences.
- [x] **State Actions**: `INCREMENT`, `SET`, `RESET` actions to modify state.
- [x] **Dynamic Map**: Bind events to state updates to creating "Combo" or "Goal" triggers.

### B. Robustness & Validation

- [x] Migrate to ArkType (Completed).
- [x] **Strict Typing**: Ensure `params` in Actions match the specific Action Type's schema.
- [x] **Strict Typing**: Ensure `params` in Actions match the specific Action Type's schema.
- [x] **Circular Dependency Detection**: Prevent rule loops.

### C. Developer Experience

- [x] **CLI Tool**: `bun run validate-rules` to check YAML files during CI/CD.
- [x] **Language Server (LSP)**: Integrated validation for VS Code.
- [x] **LSP Unit Tests**: Verified via `tests/lsp_diagnostics.test.ts`.

## 4. Architecture Standards

- **Immutability**: Context data should be immutable during a rule execution pass.
- **Async First**: All actions should be treated as async to support I/O operations.
- **Fail-Safe**: One failing action should not crash the engine.

## 5. Future Roadmap

### A. Infrastructure & Persistence

- [x] **Persistence Layer**: Implemented `PersistenceAdapter` interface and `InMemoryPersistence` (`src/core/persistence.ts`).
- [x] **Event Queue**: Implemented `EventQueue` for high-load buffering (`src/core/event-queue.ts`).
- [x] **File Persistence**: Implemented `FilePersistence` for Node.js (`src/core/persistence-file.ts`).
- [x] **Browser Persistence**: Implemented `BrowserPersistence` for LocalStorage (`src/core/persistence-browser.ts`).
