# appPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppPermission records via csdk CLI

## Usage

```bash
csdk app-permission list
csdk app-permission list --where.<field>.<op> <value> --orderBy <values>
csdk app-permission list --limit 10 --after <cursor>
csdk app-permission find-first --where.<field>.<op> <value>
csdk app-permission get --id <UUID>
csdk app-permission create [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
csdk app-permission update --id <UUID> [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
csdk app-permission delete --id <UUID>
```

## Examples

### List appPermission records

```bash
csdk app-permission list
```

### List appPermission records with pagination

```bash
csdk app-permission list --limit 10 --offset 0
```

### List appPermission records with cursor pagination

```bash
csdk app-permission list --limit 10 --after <cursor>
```

### Find first matching appPermission

```bash
csdk app-permission find-first --where.id.equalTo <value>
```

### List appPermission records with field selection

```bash
csdk app-permission list --select id,id
```

### List appPermission records with filtering and ordering

```bash
csdk app-permission list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appPermission

```bash
csdk app-permission create [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
```

### Get a appPermission by id

```bash
csdk app-permission get --id <value>
```
