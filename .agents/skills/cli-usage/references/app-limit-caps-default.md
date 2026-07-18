# appLimitCapsDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimitCapsDefault records via csdk CLI

## Usage

```bash
csdk app-limit-caps-default list
csdk app-limit-caps-default list --where.<field>.<op> <value> --orderBy <values>
csdk app-limit-caps-default list --limit 10 --after <cursor>
csdk app-limit-caps-default find-first --where.<field>.<op> <value>
csdk app-limit-caps-default get --id <UUID>
csdk app-limit-caps-default create --name <String> [--max <BigInt>]
csdk app-limit-caps-default update --id <UUID> [--max <BigInt>] [--name <String>]
csdk app-limit-caps-default delete --id <UUID>
```

## Examples

### List appLimitCapsDefault records

```bash
csdk app-limit-caps-default list
```

### List appLimitCapsDefault records with pagination

```bash
csdk app-limit-caps-default list --limit 10 --offset 0
```

### List appLimitCapsDefault records with cursor pagination

```bash
csdk app-limit-caps-default list --limit 10 --after <cursor>
```

### Find first matching appLimitCapsDefault

```bash
csdk app-limit-caps-default find-first --where.id.equalTo <value>
```

### List appLimitCapsDefault records with field selection

```bash
csdk app-limit-caps-default list --select id,id
```

### List appLimitCapsDefault records with filtering and ordering

```bash
csdk app-limit-caps-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLimitCapsDefault

```bash
csdk app-limit-caps-default create --name <String> [--max <BigInt>]
```

### Get a appLimitCapsDefault by id

```bash
csdk app-limit-caps-default get --id <value>
```
