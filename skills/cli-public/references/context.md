# Context Management

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Manage API endpoint contexts for app

## Usage

```bash
app context create <name> --endpoint <url>
app context list
app context use <name>
app context current
app context delete <name>
```

## Examples

### Create and activate a context

```bash
app context create production --endpoint https://api.example.com/graphql
app context use production
```

### List all contexts

```bash
app context list
```
