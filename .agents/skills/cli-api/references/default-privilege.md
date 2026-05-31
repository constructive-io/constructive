# defaultPrivilege

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DefaultPrivilege records via csdk CLI

## Usage

```bash
csdk default-privilege list
csdk default-privilege list --where.<field>.<op> <value> --orderBy <values>
csdk default-privilege list --limit 10 --after <cursor>
csdk default-privilege find-first --where.<field>.<op> <value>
csdk default-privilege get --id <UUID>
csdk default-privilege create --schemaId <UUID> --objectType <String> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--isGrant <Boolean>]
csdk default-privilege update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--objectType <String>] [--privilege <String>] [--granteeName <String>] [--isGrant <Boolean>]
csdk default-privilege delete --id <UUID>
```

## Examples

### List defaultPrivilege records

```bash
csdk default-privilege list
```

### List defaultPrivilege records with pagination

```bash
csdk default-privilege list --limit 10 --offset 0
```

### List defaultPrivilege records with cursor pagination

```bash
csdk default-privilege list --limit 10 --after <cursor>
```

### Find first matching defaultPrivilege

```bash
csdk default-privilege find-first --where.id.equalTo <value>
```

### List defaultPrivilege records with field selection

```bash
csdk default-privilege list --select id,id
```

### List defaultPrivilege records with filtering and ordering

```bash
csdk default-privilege list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a defaultPrivilege

```bash
csdk default-privilege create --schemaId <UUID> --objectType <String> --privilege <String> --granteeName <String> [--databaseId <UUID>] [--isGrant <Boolean>]
```

### Get a defaultPrivilege by id

```bash
csdk default-privilege get --id <value>
```
