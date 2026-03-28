# orgPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgPermission records via csdk CLI

## Usage

```bash
csdk org-permission list
csdk org-permission list --where.<field>.<op> <value> --orderBy <values>
csdk org-permission list --limit 10 --after <cursor>
csdk org-permission find-first --where.<field>.<op> <value>
csdk org-permission get --id <UUID>
csdk org-permission create [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
csdk org-permission update --id <UUID> [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
csdk org-permission delete --id <UUID>
```

## Examples

### List orgPermission records

```bash
csdk org-permission list
```

### List orgPermission records with pagination

```bash
csdk org-permission list --limit 10 --offset 0
```

### List orgPermission records with cursor pagination

```bash
csdk org-permission list --limit 10 --after <cursor>
```

### Find first matching orgPermission

```bash
csdk org-permission find-first --where.id.equalTo <value>
```

### List orgPermission records with field selection

```bash
csdk org-permission list --select id,id
```

### List orgPermission records with filtering and ordering

```bash
csdk org-permission list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgPermission

```bash
csdk org-permission create [--name <String>] [--bitnum <Int>] [--bitstr <BitString>] [--description <String>]
```

### Get a orgPermission by id

```bash
csdk org-permission get --id <value>
```
