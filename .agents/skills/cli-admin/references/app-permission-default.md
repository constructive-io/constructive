# appPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppPermissionDefault records via csdk CLI

## Usage

```bash
csdk app-permission-default list
csdk app-permission-default list --where.<field>.<op> <value> --orderBy <values>
csdk app-permission-default list --limit 10 --after <cursor>
csdk app-permission-default find-first --where.<field>.<op> <value>
csdk app-permission-default get --id <UUID>
csdk app-permission-default create [--permissions <BitString>]
csdk app-permission-default update --id <UUID> [--permissions <BitString>]
csdk app-permission-default delete --id <UUID>
```

## Examples

### List appPermissionDefault records

```bash
csdk app-permission-default list
```

### List appPermissionDefault records with pagination

```bash
csdk app-permission-default list --limit 10 --offset 0
```

### List appPermissionDefault records with cursor pagination

```bash
csdk app-permission-default list --limit 10 --after <cursor>
```

### Find first matching appPermissionDefault

```bash
csdk app-permission-default find-first --where.id.equalTo <value>
```

### List appPermissionDefault records with field selection

```bash
csdk app-permission-default list --select id,id
```

### List appPermissionDefault records with filtering and ordering

```bash
csdk app-permission-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appPermissionDefault

```bash
csdk app-permission-default create [--permissions <BitString>]
```

### Get a appPermissionDefault by id

```bash
csdk app-permission-default get --id <value>
```
