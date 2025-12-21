# Import Feature for LSP Autocompletion

This feature allows you to import data from JSON or YAML files using special comments in your rule files, enabling enhanced autocompletion and hover information based on your actual data structure.

## Syntax

Add import directives as comments at the top of your YAML files:

```yaml
# @import alias from './path/to/file.json'
# @import config from './config.yaml'
```

## Examples

### Import from JSON

```yaml
# @import data from './data.json'

- id: test-user
  on: USER_LOGIN
  if:
    field: data.username
    operator: EQ
    value: "admin"
  do:
    type: log
    params:
      message: "User ${data.username} logged in"
```

### Import from YAML

```yaml
# @import config from './config.yaml'

- id: test-config
  on: APP_START
  if:
    field: config.app.debug
    operator: EQ
    value: true
  do:
    type: log
    params:
      message: "Starting ${config.app.name}"
```

### Multiple Imports

```yaml
# @import data from './data.json'
# @import config from './config.yaml'

- id: combined-test
  on: TEST_EVENT
  if:
    field: data.username
    operator: EQ
    value: "admin"
  do:
    type: log
    params:
      message: "User ${data.username} with config ${config.app.name}"
```

## Features

- **Autocompletion**: Get suggestions for field paths like `data.username`, `config.app.debug`, etc.
- **Hover Information**: See actual values from your imported files when hovering over template variables
- **Type Information**: See data types (string, number, boolean, object, array) for each field
- **Multiple Formats**: Supports both JSON and YAML import files
- **Relative Paths**: Paths are resolved relative to the current file location

## Path Resolution

- Relative paths are resolved from the directory containing the current YAML file
- Both `./file.json` and `../data/file.json` style paths are supported
- Absolute paths are not recommended for portability

## Data Structure

When you import with an alias like `data`, the imported data becomes available under that namespace:

- `# @import data from './file.json'` → Access as `data.field.subfield`
- `# @import config from './config.yaml'` → Access as `config.app.debug`

The special alias `data` is merged directly into the root namespace for backward compatibility.

## Example Files

See the `tests/rules/examples/` directory for complete examples:

- `test_data_import.yaml` - Uses `./data.json`
- `with_yaml_imports.yaml` - Uses `./config.yaml`
- `with_imports.yaml` - Shows multiple imports

## Integration with Existing Features

The import feature works seamlessly with:
- Template variable autocompletion (`${data.field}`)
- Hover information for template variables
- Field path suggestions in conditions
- All existing LSP features