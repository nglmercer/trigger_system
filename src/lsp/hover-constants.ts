// src/lsp/hover-constants.ts
/**
 * Hover documentation constants
 * Contains all static documentation for fields, operators, actions
 */

import type { MarkupContent } from 'vscode-languageserver/node';

/**
 * Field documentation with descriptions and allowed values
 */
export const FIELD_DOCS: Record<string, { description: string; values?: string; examples?: string[] }> = {
    id: {
        description: 'Unique identifier for this rule',
        examples: ['my-rule-1', 'donation-handler', 'user-login-tracker']
    },
    name: {
        description: 'Human-readable name for the rule',
        examples: ['Donation Handler', 'User Login Tracker']
    },
    description: {
        description: 'Detailed description of what this rule does',
    },
    on: {
        description: 'The event name that triggers this rule',
        values: 'String event name (e.g., `Donation`, `UserLogin`, `minecraft:player_join`)',
        examples: ['Donation', 'UserLogin', 'minecraft:player_join', 'COMMAND']
    },
    if: {
        description: 'Condition(s) that must be met for the rule to execute',
        values: 'Single condition object, array of conditions, or condition group with AND/OR operator'
    },
    do: {
        description: 'Action(s) to execute when conditions are met',
        values: 'Single action object, array of actions, or action group with mode (ALL, SEQUENCE, EITHER)'
    },
    priority: {
        description: 'Execution priority (higher values execute first)',
        values: 'Integer number',
        examples: ['1', '10', '100']
    },
    enabled: {
        description: 'Whether this rule is active',
        values: 'Boolean: `true` or `false`',
        examples: ['true', 'false']
    },
    cooldown: {
        description: 'Minimum time in milliseconds between executions',
        values: 'Non-negative integer (milliseconds)',
        examples: ['1000', '5000', '60000']
    },
    tags: {
        description: 'Tags for categorizing and organizing rules',
        values: 'Array of strings',
        examples: ['["gameplay", "monetization"]', '["debug", "test"]']
    },
    comment: {
        description: 'Internal developer note (not used in execution)',
    },
};

/**
 * Operator documentation
 */
export const OPERATOR_DOCS: Record<string, { description: string; valueType: string; examples?: string[] }> = {
    EQ: {
        description: 'Equal to (==)',
        valueType: 'Any value',
        examples: ['value: 100', 'value: "hello"', 'value: true']
    },
    '==': {
        description: 'Equal to (same as EQ)',
        valueType: 'Any value',
        examples: ['value: 100', 'value: "hello"']
    },
    NEQ: {
        description: 'Not equal to (!=)',
        valueType: 'Any value',
        examples: ['value: 0', 'value: "goodbye"']
    },
    '!=': {
        description: 'Not equal to (same as NEQ)',
        valueType: 'Any value',
        examples: ['value: 0']
    },
    GT: {
        description: 'Greater than (>)',
        valueType: 'Number or expression string',
        examples: ['value: 100', 'value: "${state.count}"']
    },
    '>': {
        description: 'Greater than (same as GT)',
        valueType: 'Number or expression string',
        examples: ['value: 50']
    },
    GTE: {
        description: 'Greater than or equal to (>=)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '>=': {
        description: 'Greater than or equal to (same as GTE)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    LT: {
        description: 'Less than (<)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '<': {
        description: 'Less than (same as LT)',
        valueType: 'Number or expression string',
        examples: ['value: 50']
    },
    LTE: {
        description: 'Less than or equal to (<=)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    '<=': {
        description: 'Less than or equal to (same as LTE)',
        valueType: 'Number or expression string',
        examples: ['value: 100']
    },
    IN: {
        description: 'Value is in the given list',
        valueType: 'Array of values',
        examples: ['value: [1, 2, 3]', 'value: ["a", "b", "c"]']
    },
    NOT_IN: {
        description: 'Value is not in the given list',
        valueType: 'Array of values',
        examples: ['value: [0, null]']
    },
    CONTAINS: {
        description: 'String contains substring, or array includes item',
        valueType: 'String (for substring) or Array (for item check)',
        examples: ['value: "hello"', 'value: ["item1", "item2"]']
    },
    NOT_CONTAINS: {
        description: 'String does not contain substring, or array does not include item',
        valueType: 'String (for substring) or Array (for item check)',
        examples: ['value: "spam"', 'value: ["excluded"]']
    },
    STARTS_WITH: {
        description: 'String starts with the specified prefix',
        valueType: 'String',
        examples: ['value: "https://"', 'value: "user_"']
    },
    ENDS_WITH: {
        description: 'String ends with the specified suffix',
        valueType: 'String',
        examples: ['value: ".com"', 'value: "_admin"']
    },
    IS_EMPTY: {
        description: 'Value is empty (string, array, object, or null)',
        valueType: 'No value required',
        examples: ['(no value needed)']
    },
    IS_NULL: {
        description: 'Value is null or undefined',
        valueType: 'No value required',
        examples: ['(no value needed)']
    },
    IS_NONE: {
        description: 'Alias for IS_NULL',
        valueType: 'No value required',
        examples: ['(no value needed)']
    },
    HAS_KEY: {
        description: 'Object has the specified key',
        valueType: 'String (key name)',
        examples: ['value: "userId"', 'value: "role"']
    },
    MATCHES: {
        description: 'Value matches the regular expression pattern',
        valueType: 'String (regex pattern)',
        examples: ['value: "^[A-Z].*"', 'value: "\\\\d{3}-\\\\d{4}"']
    },
    RANGE: {
        description: 'Value is within the specified range [min, max] (inclusive)',
        valueType: 'Array of exactly 2 numbers: [min, max]',
        examples: ['value: [0, 100]', 'value: [1, 10]']
    },
    SINCE: {
        description: 'Date/time is after or equal to the specified value',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-01-01"']
    },
    AFTER: {
        description: 'Date/time is after the specified value (alias for SINCE)',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-01-01T00:00:00Z"']
    },
    BEFORE: {
        description: 'Date/time is before the specified value',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-12-31"']
    },
    UNTIL: {
        description: 'Date/time is before or equal to the specified value (alias for BEFORE)',
        valueType: 'Date string or timestamp',
        examples: ['value: "2024-12-31T23:59:59Z"']
    },
    AND: {
        description: 'Logical AND - all conditions must be true',
        valueType: 'Used in condition groups',
        examples: ['operator: AND\nconditions:\n  - field: data.x\n    operator: GT\n    value: 0']
    },
    OR: {
        description: 'Logical OR - at least one condition must be true',
        valueType: 'Used in condition groups',
        examples: ['operator: OR\nconditions:\n  - field: data.x\n    operator: EQ\n    value: 1']
    }
};

/**
 * Condition field documentation
 */
export const CONDITION_FIELD_DOCS: Record<string, { description: string; values?: string }> = {
    field: {
        description: 'The field path to check (e.g., `data.amount`, `event.user.id`)',
        values: 'String path using dot notation'
    },
    operator: {
        description: 'The comparison operator to use',
        values: 'One of: EQ, ==, NEQ, !=, GT, >, GTE, >=, LT, <, LTE, <=, IN, NOT_IN, CONTAINS, NOT_CONTAINS, STARTS_WITH, ENDS_WITH, IS_EMPTY, IS_NULL, HAS_KEY, MATCHES, RANGE, SINCE, AFTER, BEFORE, UNTIL'
    },
    value: {
        description: 'The value to compare against (type depends on operator)',
        values: 'Varies by operator - see operator documentation for details'
    },
    conditions: {
        description: 'Array of sub-conditions for AND/OR groups',
        values: 'Array of condition objects'
    }
};

/**
 * Action field documentation
 */
export const ACTION_FIELD_DOCS: Record<string, { description: string; values?: string }> = {
    type: {
        description: 'The type of action to perform',
        values: 'String action type (e.g., `log`, `execute`, `notify`, `STATE_SET`, `EMIT_EVENT`)'
    },
    params: {
        description: 'Parameters for the action (varies by action type)',
        values: 'Object with action-specific parameters'
    },
    run: {
        description: 'Direct script execution block (JavaScript-like syntax)',
        values: 'String block of code'
    },
    delay: {
        description: 'Delay in milliseconds before executing this action',
        values: 'Non-negative integer (milliseconds)'
    },
    probability: {
        description: 'Probability of executing this action (0.0 to 1.0)',
    },
    mode: {
        description: 'Execution mode for action groups',
        values: 'ALL (execute all), SEQUENCE (execute in order), or EITHER (execute one randomly)'
    },
    actions: {
        description: 'Array of sub-actions for action groups',
        values: 'Array of action objects'
    },
    then: {
        description: 'Actions to execute when condition is true',
        values: 'Action object or array of actions'
    },
    else: {
        description: 'Actions to execute when condition is false',
        values: 'Action object or array of actions'
    }
};

/**
 * Action type documentation
 */
export const ACTION_TYPE_DOCS: Record<string, { description: string; params: string[] }> = {
    log: {
        description: 'Prints a message to the engine console for debugging',
        params: ['message: string (supports interpolation)']
    },
    math: {
        description: 'Expression to evaluate (e.g. "1 + 2" or "\'Hi \' + data.user")',
        params: ['expression: string (e.g. "1 + 2" or "\'Hello \' + data.name")']
    },
    execute: {
        description: 'Runs a shell command on the host (Node.js only)',
        params: ['command: string', 'safe: boolean']
    },
    notify: {
        description: 'Sends a notification to a specified target',
        params: ['message: string', 'target: string']
    },
    STATE_SET: {
        description: 'Updates a value in the global state manager',
        params: ['key: string', 'value: any']
    },
    STATE_OP: {
        description: 'Performs direct operations on state using a script',
        params: ['run: string']
    }
};
