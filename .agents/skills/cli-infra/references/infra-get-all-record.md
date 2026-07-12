# infraGetAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraGetAllRecord records via csdk CLI

## Usage

```bash
csdk infra-get-all-record list
csdk infra-get-all-record list --where.<field>.<op> <value> --orderBy <values>
csdk infra-get-all-record list --limit 10 --after <cursor>
csdk infra-get-all-record find-first --where.<field>.<op> <value>
csdk infra-get-all-record get --id <UUID>
csdk infra-get-all-record create --path <String> --data <JSON>
csdk infra-get-all-record update --id <UUID> [--path <String>] [--data <JSON>]
csdk infra-get-all-record delete --id <UUID>
```

## Examples

### List infraGetAllRecord records

```bash
csdk infra-get-all-record list
```

### List infraGetAllRecord records with pagination

```bash
csdk infra-get-all-record list --limit 10 --offset 0
```

### List infraGetAllRecord records with cursor pagination

```bash
csdk infra-get-all-record list --limit 10 --after <cursor>
```

### Find first matching infraGetAllRecord

```bash
csdk infra-get-all-record find-first --where.id.equalTo <value>
```

### List infraGetAllRecord records with field selection

```bash
csdk infra-get-all-record list --select id,id
```

### List infraGetAllRecord records with filtering and ordering

```bash
csdk infra-get-all-record list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraGetAllRecord

```bash
csdk infra-get-all-record create --path <String> --data <JSON>
```

### Get a infraGetAllRecord by id

```bash
csdk infra-get-all-record get --id <value>
```
