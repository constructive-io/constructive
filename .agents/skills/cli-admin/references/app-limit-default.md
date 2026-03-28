# appLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitDefault records via csdk CLI

## Usage

```bash
csdk app-limit-default list
csdk app-limit-default list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-default list --limit 10 --after <cursor>
csdk app-limit-default find-first --where.<field>.<op> <value>
csdk app-limit-default get --id <UUID>
csdk app-limit-default create --name <String> [--max <Int>]
csdk app-limit-default update --id <UUID> [--name <String>] [--max <Int>]
csdk app-limit-default delete --id <UUID>
```

## Examples

### List appLimitDefault records

```bash
csdk app-limit-default list
```

### List appLimitDefault records with pagination

```bash
csdk app-limit-default list --limit 10 --offset 0
```

### List appLimitDefault records with cursor pagination

```bash
csdk app-limit-default list --limit 10 --after <cursor>
```

### Find first matching appLimitDefault

```bash
csdk app-limit-default find-first --where.id.equalTo <value>
```

### List appLimitDefault records with field selection

```bash
csdk app-limit-default list --select id,id
```

### List appLimitDefault records with filtering and ordering

```bash
csdk app-limit-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitDefault

```bash
csdk app-limit-default create --name <String> [--max <Int>]
```

### Get a appLimitDefault by id

```bash
csdk app-limit-default get --id <value>
```
