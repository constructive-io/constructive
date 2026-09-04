# Context Management

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Manage API endpoint contexts for csdk

## Usage

```bash
csdk context create <name> --endpoint <url>
csdk context list
csdk context use <name>
csdk context current
csdk context delete <name>
```

## Examples

### Create and activate a context

```bash
csdk context create production --endpoint https://api.example.com/graphql
csdk context use production
```

### List all contexts

```bash
csdk context list
```
