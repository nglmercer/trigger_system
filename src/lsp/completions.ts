// src/lsp/completions.ts
/**
 * LSP Completion Provider
 * 
 * This module provides auto-completion for YAML rule files.
 * 
 * Architecture:
 * - completion-index.ts: Main entry point and orchestration
 * - completion-constants.ts: Static completion items (operators, events, actions, snippets)
 * - completion-helpers.ts: Utility functions for path finding
 * - completion-context.ts: Context-aware completion logic
 * - completion-templates.ts: Template variable (${...}) completions
 * - completion-directives.ts: Directive (@import, @disable-lint) completions
 * 
 * @module
 */

export * from './completion-index';
export { 
    TOP_LEVEL_KEYS,
    EVENTS,
    OPERATORS,
    ACTION_TYPES,
    CONDITION_KEYS,
    ACTION_KEYS,
    PARAM_KEYS,
    SNIPPETS,
    EXECUTION_MODES,
    BOOLEAN_VALUES
} from './completion-constants';

export { getCompletionItems } from './completion-index';
