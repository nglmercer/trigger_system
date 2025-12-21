# LSP Features Guide

This document describes the Language Server Protocol (LSP) features available for YAML trigger files.

## Table of Contents

1. [Directive-Based Lint Control](#directive-based-lint-control)
2. [Data Context for Autocompletion](#data-context-for-autocompletion)
3. [Template Variable Hover](#template-variable-hover)
4. [Rule ID Validation](#rule-id-validation)

---

## Directive-Based Lint Control

You can control diagnostic messages using special comments (directives) in your YAML files.

### Supported Directives

#### `@disable-lint` / `@enable-lint`

Disable or enable all linting for a block of code.

```yaml
# @disable-lint
- on: INVALID_EVENT
  priority: "not a number"
  # All errors in this section are suppressed
# @enable-lint
```

#### `@disable-next-line`

Disable linting for the next line only.

```yaml
# @disable-next-line
- on: SOME_EVENT
  # Missing id - error suppressed
```

#### `@disable-line`

Disable linting for the current line.

```yaml
- on: INVALID # @disable-line
```

#### `@disable-rule` / `@enable-rule`

Disable specific lint rules by name.

```yaml
# @disable-rule trigger-validator
- id: test
  on: EVENT
  # Missing 'do' field, but trigger-validator is disabled
# @enable-rule trigger-validator
```

Multiple rules can be specified:

```yaml
# @disable-rule trigger-validator, yaml-parser
```

---

## Data Context for Autocompletion

The LSP can load test data from JSON or YAML files to provide intelligent autocompletion for template variables.

### Setup

Create a `data.json` or `data.yaml` file in your workspace:

**data.json:**

```json
{
  "username": "admin",
  "score": 100,
  "user": {
    "id": "123",
    "email": "admin@example.com"
  }
}
```

**data.yaml:**

```yaml
username: admin
score: 100
user:
  id: "123"
  email: admin@example.com
```

### Autocompletion

When you type `${data.`, the LSP will suggest available fields:

- `username` (string = "admin")
- `score` (number = 100)
- `user` (object)

For nested objects, type `${data.user.` to see:

- `id` (string = "123")
- `email` (string = "admin@example.com")

### Example

```yaml
- id: user-login
  on: USER_LOGIN
  if:
    field: data.username # Type 'data.' to see suggestions
    operator: EQ
    value: "${data.username}" # Type '${data.' to see completions
  do:
    - type: LOG
      params:
        message: "User ${data.user.email} logged in"
```

---

## Template Variable Hover

Hover over any template variable (e.g., `${data.username}`) to see:

- Variable path
- Data type
- Test value from your data context

### Example Hover Output

When hovering over `${data.username}`:

```
Template Variable: `${data.username}`

Type: `string`

Test Value:
"admin"
```

When hovering over `${data.user}`:

```
Template Variable: `${data.user}`

Type: `object`

Test Value:
{
  "id": "123",
  "email": "admin@example.com"
}
```

If no test data is available:

```
Template Variable: `${data.customField}`

No test data available for this variable.

Add a `data.json` or `data.yaml` file in your workspace to provide test values.
```

---

## Rule ID Validation

**By default**, all rules in YAML files **must have an `id` field**.

### Valid Example

```yaml
- id: my-rule
  on: EVENT
  do:
    type: LOG
    params:
      message: "Hello"
```

### Invalid Example (Error)

```yaml
- on: EVENT # ❌ Error: Rule is missing required field: id
  do:
    type: LOG
    params:
      message: "Hello"
```

### Suppressing ID Validation

If you need to temporarily disable this check:

```yaml
# @disable-next-line
- on: EVENT
  # No error even without id
  do:
    type: LOG
```

Or disable for a block:

```yaml
# @disable-rule trigger-validator
- on: EVENT_1
  do:
    type: LOG

- on: EVENT_2
  do:
    type: LOG
# @enable-rule trigger-validator
```

---

## Best Practices

1. **Always provide an `id`** for your rules unless you have a specific reason not to
2. **Create a `data.json`** in your workspace to get better autocompletion and hover hints
3. **Use directives sparingly** - they should be temporary or for edge cases
4. **Document why** you're disabling linting with a comment

### Good Example

```yaml
# data.json exists with test values
- id: admin-login-handler
  on: USER_LOGIN
  priority: 10
  if:
    field: data.username
    operator: EQ
    value: "admin"
  do:
    - type: LOG
      params:
        message: "Admin logged in: ${data.username}"
```

### Example with Directive

```yaml
# TODO: Add proper validation before enabling lint
# @disable-next-line
- on: EXPERIMENTAL_EVENT
  do:
    type: LOG
    params:
      message: "Testing new feature"
```

---

## Troubleshooting

### Autocompletion not working

1. Ensure you have a `data.json` or `data.yaml` file in your workspace
2. Check that the file is valid JSON/YAML
3. Restart your editor/LSP server

### Directives not working

1. Ensure the directive starts with `#` followed by `@`
2. Check spelling: `@disable-lint`, not `@disable_lint`
3. Directives must be on their own line (except `@disable-line`)

### Hover not showing values

1. Verify your `data.json` contains the field you're hovering over
2. Ensure the template variable syntax is correct: `${data.field}`
3. Check that the LSP server is running

---

## Feature Summary

| Feature                  | Description                   | Status         |
| ------------------------ | ----------------------------- | -------------- |
| `@disable-lint`          | Disable all linting           | ✅ Implemented |
| `@enable-lint`           | Re-enable linting             | ✅ Implemented |
| `@disable-next-line`     | Disable lint on next line     | ✅ Implemented |
| `@disable-line`          | Disable lint on current line  | ✅ Implemented |
| `@disable-rule`          | Disable specific rules        | ✅ Implemented |
| `@enable-rule`           | Re-enable specific rules      | ✅ Implemented |
| Data context loading     | Load test data from files     | ✅ Implemented |
| Template autocompletion  | Complete `${data.}` variables | ✅ Implemented |
| Template hover           | Show test values on hover     | ✅ Implemented |
| Required `id` validation | Enforce `id` field on rules   | ✅ Implemented |

---

## Examples

See the following files for working examples:

- `tests/rules/examples/sample.yaml` - Basic rule examples with data variables
- `tests/rules/examples/directives_example.yaml` - Directive usage examples
- `tests/rules/examples/data.json` - Example data context file
