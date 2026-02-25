# Tasks

## Active

- [x] **Observability**: Implemented `triggerEmitter` for real-time monitoring and logging.

## Completed

- [x] **Analyze Library & Roadmap**: Created roadmap and task list.
- [x] **Refactor Dependency Injection**: Implemented `ActionRegistry` in `src/core/action-registry.ts`.
- [x] **Implement 'File Loader'**: Added `watchRules` to `TriggerLoader` in `src/io/loader.ts`.
- [x] **Enhance Expression/Rule Engine**:
  - Added support for dynamic values (e.g. `value: "${vars.limit}"`).
  - Added Date operators (`SINCE`, `BEFORE`, `AFTER`, `UNTIL`).
  - Added Regex support (`MATCHES`).
- [x] **Context Adapters**: Implemented `ContextAdapter` in `src/core/context-adapter.ts`.
- [x] **State Manager**: Support for `state` in Context (`src/core/state-manager.ts`) and state-modifying actions (`STATE_SET`, `STATE_INCREMENT`).

- [x] **Validator Refactor**: Migrated to ArkType for optimized, recursive schema validation (`src/domain/validator.ts`).

- [x] **Verification V2**: Confirmed new features (Custom Actions, Dynamic Values, Date Ops, Regex) with `tests/verification_v2.test.ts`.
- [x] **CLI Tool**: Implemented `src/cli/validate.ts` and `bun run validate`.

- [x] **Circular Dependency Check**: Implemented `src/core/dependency-graph.ts` static analyzer.
- [x] **LSP Server**: Implemented `src/lsp/server.ts` for editor integration.
- [x] **Persistence Interface**: Created `PersistenceAdapter` and `InMemoryPersistence`.
- [x] **Event Queue**: Created `src/core/event-queue.ts`.
- [x] **Expression Robustness**: Updated engine to support `||` defaults and handle nulls safely.
- [x] **Fluent SDK**: Implemented `RuleBuilder`, `ConditionBuilder`, and `ActionBuilder` for programmatic rule creation.
- [x] **Rule Exporter**: Added YAML generation and file-saving capabilities to the SDK.
- [x] **Progressive Examples**: Created step-by-step tutorial examples (1.0 to 2.0).
- [x] **Documentation Guide**: Created `EXAMPLES_GUIDE.md` and `SDK_GUIDE.md`.
