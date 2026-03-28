# orgGetSubordinatesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgGetSubordinatesRecord records via csdk CLI

## Usage

```bash
csdk org-get-subordinates-record list
csdk org-get-subordinates-record list --where.<field>.<op> <value> --orderBy <values>
csdk org-get-subordinates-record list --limit 10 --after <cursor>
csdk org-get-subordinates-record find-first --where.<field>.<op> <value>
csdk org-get-subordinates-record get --id <UUID>
csdk org-get-subordinates-record create --userId <UUID> --depth <Int>
csdk org-get-subordinates-record update --id <UUID> [--userId <UUID>] [--depth <Int>]
csdk org-get-subordinates-record delete --id <UUID>
```

## Examples

### List orgGetSubordinatesRecord records

```bash
csdk org-get-subordinates-record list
```

### List orgGetSubordinatesRecord records with pagination

```bash
csdk org-get-subordinates-record list --limit 10 --offset 0
```

### List orgGetSubordinatesRecord records with cursor pagination

```bash
csdk org-get-subordinates-record list --limit 10 --after <cursor>
```

### Find first matching orgGetSubordinatesRecord

```bash
csdk org-get-subordinates-record find-first --where.id.equalTo <value>
```

### List orgGetSubordinatesRecord records with field selection

```bash
csdk org-get-subordinates-record list --select id,id
```

### List orgGetSubordinatesRecord records with filtering and ordering

```bash
csdk org-get-subordinates-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgGetSubordinatesRecord

```bash
csdk org-get-subordinates-record create --userId <UUID> --depth <Int>
```

### Get a orgGetSubordinatesRecord by id

```bash
csdk org-get-subordinates-record get --id <value>
```
