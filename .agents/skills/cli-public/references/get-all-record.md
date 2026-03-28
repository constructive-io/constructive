# getAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for GetAllRecord records via csdk CLI

## Usage

```bash
csdk get-all-record list
csdk get-all-record list --where.<field>.<op> <value> --orderBy <values>
csdk get-all-record list --limit 10 --after <cursor>
csdk get-all-record find-first --where.<field>.<op> <value>
csdk get-all-record get --id <UUID>
csdk get-all-record create --path <String> --data <JSON>
csdk get-all-record update --id <UUID> [--path <String>] [--data <JSON>]
csdk get-all-record delete --id <UUID>
```

## Examples

### List getAllRecord records

```bash
csdk get-all-record list
```

### List getAllRecord records with pagination

```bash
csdk get-all-record list --limit 10 --offset 0
```

### List getAllRecord records with cursor pagination

```bash
csdk get-all-record list --limit 10 --after <cursor>
```

### Find first matching getAllRecord

```bash
csdk get-all-record find-first --where.id.equalTo <value>
```

### List getAllRecord records with field selection

```bash
csdk get-all-record list --select id,id
```

### List getAllRecord records with filtering and ordering

```bash
csdk get-all-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a getAllRecord

```bash
csdk get-all-record create --path <String> --data <JSON>
```

### Get a getAllRecord by id

```bash
csdk get-all-record get --id <value>
```
