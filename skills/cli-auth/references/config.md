# Config Variables

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Manage per-context key-value configuration variables for csdk

## Usage

```bash
csdk config get <key>
csdk config set <key> <value>
csdk config list
csdk config delete <key>
```

## Examples

### Store and retrieve a config variable

```bash
csdk config set orgId abc-123
csdk config get orgId
```

### List all config variables

```bash
csdk config list
```
