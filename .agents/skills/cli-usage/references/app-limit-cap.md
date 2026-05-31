# appLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCap records via csdk CLI

## Usage

```bash
csdk app-limit-cap list
csdk app-limit-cap list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-cap list --limit 10 --after <cursor>
csdk app-limit-cap find-first --where.<field>.<op> <value>
csdk app-limit-cap get --id <UUID>
csdk app-limit-cap create --name <String> --entityId <UUID> [--max <BigInt>]
csdk app-limit-cap update --id <UUID> [--name <String>] [--entityId <UUID>] [--max <BigInt>]
csdk app-limit-cap delete --id <UUID>
```

## Examples

### List appLimitCap records

```bash
csdk app-limit-cap list
```

### List appLimitCap records with pagination

```bash
csdk app-limit-cap list --limit 10 --offset 0
```

### List appLimitCap records with cursor pagination

```bash
csdk app-limit-cap list --limit 10 --after <cursor>
```

### Find first matching appLimitCap

```bash
csdk app-limit-cap find-first --where.id.equalTo <value>
```

### List appLimitCap records with field selection

```bash
csdk app-limit-cap list --select id,id
```

### List appLimitCap records with filtering and ordering

```bash
csdk app-limit-cap list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCap

```bash
csdk app-limit-cap create --name <String> --entityId <UUID> [--max <BigInt>]
```

### Get a appLimitCap by id

```bash
csdk app-limit-cap get --id <value>
```
