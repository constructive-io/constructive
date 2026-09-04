# userSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserSetting records via csdk CLI

## Usage

```bash
csdk user-setting list
csdk user-setting list --where.<field>.<op> <value> --orderBy <values>
csdk user-setting list --limit 10 --after <cursor>
csdk user-setting find-first --where.<field>.<op> <value>
csdk user-setting get --id <UUID>
csdk user-setting create [--ownerId <UUID>]
csdk user-setting update --id <UUID> [--ownerId <UUID>]
csdk user-setting delete --id <UUID>
```

## Examples

### List userSetting records

```bash
csdk user-setting list
```

### List userSetting records with pagination

```bash
csdk user-setting list --limit 10 --offset 0
```

### List userSetting records with cursor pagination

```bash
csdk user-setting list --limit 10 --after <cursor>
```

### Find first matching userSetting

```bash
csdk user-setting find-first --where.id.equalTo <value>
```

### List userSetting records with field selection

```bash
csdk user-setting list --select id,id
```

### List userSetting records with filtering and ordering

```bash
csdk user-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userSetting

```bash
csdk user-setting create [--ownerId <UUID>]
```

### Get a userSetting by id

```bash
csdk user-setting get --id <value>
```
