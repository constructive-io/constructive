# orgPermissionDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgPermissionDefault records via csdk CLI

## Usage

```bash
csdk org-permission-default list
csdk org-permission-default list --where.<field>.<op> <value> --orderBy <values>
csdk org-permission-default list --limit 10 --after <cursor>
csdk org-permission-default find-first --where.<field>.<op> <value>
csdk org-permission-default get --id <UUID>
csdk org-permission-default create --entityId <UUID> [--permissions <BitString>]
csdk org-permission-default update --id <UUID> [--permissions <BitString>] [--entityId <UUID>]
csdk org-permission-default delete --id <UUID>
```

## Examples

### List orgPermissionDefault records

```bash
csdk org-permission-default list
```

### List orgPermissionDefault records with pagination

```bash
csdk org-permission-default list --limit 10 --offset 0
```

### List orgPermissionDefault records with cursor pagination

```bash
csdk org-permission-default list --limit 10 --after <cursor>
```

### Find first matching orgPermissionDefault

```bash
csdk org-permission-default find-first --where.id.equalTo <value>
```

### List orgPermissionDefault records with field selection

```bash
csdk org-permission-default list --select id,id
```

### List orgPermissionDefault records with filtering and ordering

```bash
csdk org-permission-default list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgPermissionDefault

```bash
csdk org-permission-default create --entityId <UUID> [--permissions <BitString>]
```

### Get a orgPermissionDefault by id

```bash
csdk org-permission-default get --id <value>
```
