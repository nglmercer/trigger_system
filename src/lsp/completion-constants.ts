// src/lsp/completion-constants.ts
/**
 * Constants for LSP completions
 * Contains all static completion items: keys, operators, events, actions, snippets
 */

import {
    CompletionItemKind,
    InsertTextFormat
} from 'vscode-languageserver/node';
import type {
    CompletionItem,
} from 'vscode-languageserver/node';

// --- Rule-level keys ---

export const TOP_LEVEL_KEYS: CompletionItem[] = [
    { label: 'id', kind: CompletionItemKind.Field, detail: 'Unique identifier for the rule' },
    { label: 'name', kind: CompletionItemKind.Field, detail: 'Human readable name' },
    { label: 'description', kind: CompletionItemKind.Field, detail: 'What this rule does' },
    { label: 'on', kind: CompletionItemKind.Keyword, detail: 'The event that triggers this rule' },
    { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Conditions that must be met' },
    { label: 'do', kind: CompletionItemKind.Keyword, detail: 'Actions to perform when triggered' },
    { label: 'priority', kind: CompletionItemKind.Property, detail: 'Rule execution priority (higher = first)' },
    { label: 'enabled', kind: CompletionItemKind.Property, detail: 'Whether this rule is active' },
    { label: 'cooldown', kind: CompletionItemKind.Property, detail: 'Wait time in ms between executions' },
    { label: 'tags', kind: CompletionItemKind.Property, detail: 'Categorization tags' },
    { label: 'comment', kind: CompletionItemKind.Text, detail: 'Internal developer note' }
];

// --- Events ---

export const EVENTS: CompletionItem[] = [
    { label: 'minecraft:player_join', kind: CompletionItemKind.Event },
    { label: 'minecraft:player_quit', kind: CompletionItemKind.Event },
    { label: 'minecraft:chat', kind: CompletionItemKind.Event },
    { label: 'tiktok:chat', kind: CompletionItemKind.Event },
    { label: 'tiktok:gift', kind: CompletionItemKind.Event },
    { label: 'tiktok:like', kind: CompletionItemKind.Event },
    { label: 'twitch:chat', kind: CompletionItemKind.Event },
    { label: 'twitch:follow', kind: CompletionItemKind.Event },
    { label: 'bopl:webhook', kind: CompletionItemKind.Event },
    { label: 'ANY_EVENT', kind: CompletionItemKind.Event },
    { label: 'USER_LOGIN', kind: CompletionItemKind.Event },
    { label: 'GAME_OVER', kind: CompletionItemKind.Event },
    { label: 'COMMAND', kind: CompletionItemKind.Event },
    { label: 'ALERT', kind: CompletionItemKind.Event }
];

// --- Operators ---

export const OPERATORS: CompletionItem[] = [
    { label: 'EQ', kind: CompletionItemKind.Operator, detail: 'Equal (==)' },
    { label: 'NEQ', kind: CompletionItemKind.Operator, detail: 'Not Equal (!=)' },
    { label: 'GT', kind: CompletionItemKind.Operator, detail: 'Greater Than (>)' },
    { label: 'GTE', kind: CompletionItemKind.Operator, detail: 'Greater Than Equals (>=)' },
    { label: 'LT', kind: CompletionItemKind.Operator, detail: 'Less Than (<)' },
    { label: 'LTE', kind: CompletionItemKind.Operator, detail: 'Less Than Equals (<=)' },
    { label: 'IN', kind: CompletionItemKind.Operator, detail: 'Value exists in the provided list' },
    { label: 'NOT_IN', kind: CompletionItemKind.Operator, detail: 'Value does not exist in the list' },
    { label: 'CONTAINS', kind: CompletionItemKind.Operator, detail: 'String contains substring or List contains item' },
    { label: 'NOT_CONTAINS', kind: CompletionItemKind.Operator, detail: 'String does not contain substring or List does not contain item' },
    { label: 'STARTS_WITH', kind: CompletionItemKind.Operator, detail: 'String starts with prefix' },
    { label: 'ENDS_WITH', kind: CompletionItemKind.Operator, detail: 'String ends with suffix' },
    { label: 'IS_EMPTY', kind: CompletionItemKind.Operator, detail: 'Value is empty (string/array/object)' },
    { label: 'IS_NULL', kind: CompletionItemKind.Operator, detail: 'Value is null or undefined' },
    { label: 'IS_NONE', kind: CompletionItemKind.Operator, detail: 'Alias for IS_NULL' },
    { label: 'HAS_KEY', kind: CompletionItemKind.Operator, detail: 'Object has the specified key' },
    { label: 'MATCHES', kind: CompletionItemKind.Operator, detail: 'Regex pattern match' },
    { label: 'RANGE', kind: CompletionItemKind.Operator, detail: 'Numeric value between [min, max]' },
    { label: 'SINCE', kind: CompletionItemKind.Operator, detail: 'Date is after or equal to value' },
    { label: 'AFTER', kind: CompletionItemKind.Operator, detail: 'Alias for SINCE' },
    { label: 'BEFORE', kind: CompletionItemKind.Operator, detail: 'Date is before value' },
    { label: 'UNTIL', kind: CompletionItemKind.Operator, detail: 'Alias for BEFORE' },
    { label: 'AND', kind: CompletionItemKind.Operator, detail: 'Logical AND (for groups)' },
    { label: 'OR', kind: CompletionItemKind.Operator, detail: 'Logical OR (for groups)' }
];

// --- Action Types ---

export const ACTION_TYPES: CompletionItem[] = [
    { label: 'log', kind: CompletionItemKind.EnumMember, detail: 'Print message to console' },
    { label: 'math', kind: CompletionItemKind.EnumMember, detail: 'Evaluate mathematical expression' },
    { label: 'execute', kind: CompletionItemKind.EnumMember, detail: 'Run local command' },
    { label: 'forward', kind: CompletionItemKind.EnumMember, detail: 'Forward event to URL' },
    { label: 'response', kind: CompletionItemKind.EnumMember, detail: 'Return HTTP response' },
    { label: 'notify', kind: CompletionItemKind.EnumMember, detail: 'Send a notification' },
    { label: 'STATE_SET', kind: CompletionItemKind.EnumMember, detail: 'Save value to global state' },
    { label: 'STATE_GET', kind: CompletionItemKind.EnumMember, detail: 'Read state and store in context.env' },
    { label: 'STATE_INCREMENT', kind: CompletionItemKind.EnumMember, detail: 'Increment numeric state key' },
    { label: 'STATE_DELETE', kind: CompletionItemKind.EnumMember, detail: 'Delete a state key' },
    { label: 'STATE_OP', kind: CompletionItemKind.EnumMember, detail: 'Perform direct operations on state' },
    { label: 'EMIT_EVENT', kind: CompletionItemKind.EnumMember, detail: 'Trigger another event internally' },
];

// --- Condition Keys ---

export const CONDITION_KEYS: CompletionItem[] = [
    { label: 'field', kind: CompletionItemKind.Field, detail: 'Path to context data (e.g. data.user)' },
    { label: 'operator', kind: CompletionItemKind.Field, detail: 'Comparison operator (EQ, GT, etc.)' },
    { label: 'value', kind: CompletionItemKind.Value, detail: 'The value to compare against' },
    { label: 'conditions', kind: CompletionItemKind.Field, detail: 'Sub-conditions for grouping' }
];

// --- Action Keys ---

export const ACTION_KEYS: CompletionItem[] = [
    { label: 'type', kind: CompletionItemKind.Field, detail: 'The type of action to perform' },
    { label: 'params', kind: CompletionItemKind.Variable, detail: 'Configuration for the action' },
    { label: 'run', kind: CompletionItemKind.Keyword, detail: 'Direct script execution block' },
    { label: 'notify', kind: CompletionItemKind.Field, detail: 'Shorthand for notification' },
    { label: 'log', kind: CompletionItemKind.Field, detail: 'Shorthand for logging' },
    { label: 'delay', kind: CompletionItemKind.Property, detail: 'Delay in ms (integer or expression)' },
    { label: 'probability', kind: CompletionItemKind.Property, detail: 'Execution chance (0-1 or expression)' },
    { label: 'mode', kind: CompletionItemKind.Property, detail: 'Grouping mode (ALL, SEQUENCE, EITHER)' },
    { label: 'actions', kind: CompletionItemKind.Property, detail: 'List of sub-actions' },
    // Control Flow
    { label: 'if', kind: CompletionItemKind.Keyword, detail: 'Condition for conditional execution' },
    { label: 'then', kind: CompletionItemKind.Keyword, detail: 'Actions to run if condition is true' },
    { label: 'else', kind: CompletionItemKind.Keyword, detail: 'Actions to run if condition is false' },
    { label: 'break', kind: CompletionItemKind.Keyword, detail: 'Break out of action execution' },
    { label: 'continue', kind: CompletionItemKind.Keyword, detail: 'Skip remaining actions' }
];

// --- Parameter Keys by Action Type ---

export const PARAM_KEYS: Record<string, CompletionItem[]> = {
    'log': [
        { label: 'message', kind: CompletionItemKind.Property },
        { label: 'content', kind: CompletionItemKind.Property },
        { label: 'level', kind: CompletionItemKind.Property, detail: 'info, warn, error' },
    ],
    'math': [
        { label: 'expression', kind: CompletionItemKind.Property, detail: 'Expression to evaluate (e.g. "1 + 2" or "\'Hi \' + data.user")' },
    ],
    'execute': [
        { label: 'command', kind: CompletionItemKind.Property },
        { label: 'safe', kind: CompletionItemKind.Property, detail: 'boolean (default: false)' },
        { label: 'dir', kind: CompletionItemKind.Property, detail: 'working directory' },
    ],
    'forward': [
        { label: 'url', kind: CompletionItemKind.Property },
        { label: 'method', kind: CompletionItemKind.Property, detail: 'POST, GET, PUT...' },
        { label: 'headers', kind: CompletionItemKind.Property },
        { label: 'body', kind: CompletionItemKind.Property },
    ],
    'response': [
        { label: 'content', kind: CompletionItemKind.Property },
        { label: 'statusCode', kind: CompletionItemKind.Property, detail: '200, 404, etc.' },
        { label: 'contentType', kind: CompletionItemKind.Property, detail: 'application/json' },
    ],
    'STATE_SET': [
        { label: 'key', kind: CompletionItemKind.Property },
        { label: 'value', kind: CompletionItemKind.Property },
        { label: 'ttl', kind: CompletionItemKind.Property, detail: 'Time to live in ms' },
    ],
    'STATE_GET': [
        { label: 'key', kind: CompletionItemKind.Property, detail: 'State key to read' },
        { label: 'as', kind: CompletionItemKind.Property, detail: 'Variable name to store value in context.env' },
    ],
    'STATE_INCREMENT': [
        { label: 'key', kind: CompletionItemKind.Property },
        { label: 'amount', kind: CompletionItemKind.Property },
    ],
    'STATE_DELETE': [
        { label: 'key', kind: CompletionItemKind.Property, detail: 'State key to delete' },
    ],
    'EMIT_EVENT': [
        { label: 'event', kind: CompletionItemKind.Property },
        { label: 'data', kind: CompletionItemKind.Property },
    ]
};

// --- Snippets ---

export const SNIPPETS: CompletionItem[] = [
    {
        label: 'trigger_rule',
        kind: CompletionItemKind.Snippet,
        insertText: '- id: ${1:rule-id}\n  on: ${2:EVENT}\n  if:\n    field: ${3:data.field}\n    operator: ${4:EQ}\n    value: ${5:target}\n  do:\n    type: ${6:log}\n    params:\n      message: ${7:Done}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'New rule template'
    },
    {
        label: 'log_action',
        kind: CompletionItemKind.Snippet,
        insertText: 'type: log\nparams:\n  message: ${1:message}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Log action template'
    },
    {
        label: 'condition_nested',
        kind: CompletionItemKind.Snippet,
        insertText: 'operator: ${1|AND,OR|}\nconditions:\n  - field: ${2:data.x}\n    operator: ${3:EQ}\n    value: ${4:val}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Nested condition group'
    },
    {
        label: 'conditional_action',
        kind: CompletionItemKind.Snippet,
        insertText: '- if:\n    field: ${1:env.condition}\n    operator: ${2:EQ}\n    value: ${3:true}\n  then:\n    type: ${4:log}\n    params:\n      message: ${5:Condition met!}\n  else:\n    type: ${6:log}\n    params:\n      message: ${7:Condition not met!}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Conditional action with if/then/else'
    },
    {
        label: 'state_get_action',
        kind: CompletionItemKind.Snippet,
        insertText: 'type: STATE_GET\nparams:\n  key: ${1:stateKey}\n  as: ${2:variableName}',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Read state and store in variable'
    },
    {
        label: 'break_action',
        kind: CompletionItemKind.Snippet,
        insertText: 'break: true',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Break out of action execution'
    },
    {
        label: 'continue_action',
        kind: CompletionItemKind.Snippet,
        insertText: 'continue: true',
        insertTextFormat: InsertTextFormat.Snippet,
        detail: 'Skip remaining actions in group'
    }
];

// --- Execution Modes ---

export const EXECUTION_MODES: CompletionItem[] = [
    { label: 'ALL', kind: CompletionItemKind.EnumMember, detail: 'Execute all' },
    { label: 'SEQUENCE', kind: CompletionItemKind.EnumMember, detail: 'Wait for each' },
    { label: 'EITHER', kind: CompletionItemKind.EnumMember, detail: 'Random choice' }
];

// --- Boolean Values ---

export const BOOLEAN_VALUES: CompletionItem[] = [
    { label: 'true', kind: CompletionItemKind.Value },
    { label: 'false', kind: CompletionItemKind.Value }
];
