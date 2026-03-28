# orgGetManagersRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGetManagersRecord records via csdk CLI

## Usage

```bash
csdk org-get-managers-record list
csdk org-get-managers-record list --where.<field>.<op> <value> --orderBy <values>
csdk org-get-managers-record list --limit 10 --after <cursor>
csdk org-get-managers-record find-first --where.<field>.<op> <value>
csdk org-get-managers-record get --id <UUID>
csdk org-get-managers-record create --userId <UUID> --depth <Int>
csdk org-get-managers-record update --id <UUID> [--userId <UUID>] [--depth <Int>]
csdk org-get-managers-record delete --id <UUID>
```

## Examples

### List orgGetManagersRecord records

```bash
csdk org-get-managers-record list
```

### List orgGetManagersRecord records with pagination

```bash
csdk org-get-managers-record list --limit 10 --offset 0
```

### List orgGetManagersRecord records with cursor pagination

```bash
csdk org-get-managers-record list --limit 10 --after <cursor>
```

### Find first matching orgGetManagersRecord

```bash
csdk org-get-managers-record find-first --where.id.equalTo <value>
```

### List orgGetManagersRecord records with field selection

```bash
csdk org-get-managers-record list --select id,id
```

### List orgGetManagersRecord records with filtering and ordering

```bash
csdk org-get-managers-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgGetManagersRecord

```bash
csdk org-get-managers-record create --userId <UUID> --depth <Int>
```

### Get a orgGetManagersRecord by id

```bash
csdk org-get-managers-record get --id <value>
```
