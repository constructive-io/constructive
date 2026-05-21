# partition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Partition records via csdk CLI

## Usage

```bash
csdk partition list
csdk partition list --where.<field>.<op> <value> --orderBy <values>
csdk partition list --limit 10 --after <cursor>
csdk partition find-first --where.<field>.<op> <value>
csdk partition get --id <UUID>
csdk partition create --databaseId <UUID> --tableId <UUID> --strategy <String> --partitionKeyId <UUID> [--interval <String>] [--retention <String>] [--retentionKeepTable <Boolean>] [--premake <Int>] [--namingPattern <String>]
csdk partition update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--strategy <String>] [--partitionKeyId <UUID>] [--interval <String>] [--retention <String>] [--retentionKeepTable <Boolean>] [--premake <Int>] [--namingPattern <String>]
csdk partition delete --id <UUID>
```

## Examples

### List partition records

```bash
csdk partition list
```

### List partition records with pagination

```bash
csdk partition list --limit 10 --offset 0
```

### List partition records with cursor pagination

```bash
csdk partition list --limit 10 --after <cursor>
```

### Find first matching partition

```bash
csdk partition find-first --where.id.equalTo <value>
```

### List partition records with field selection

```bash
csdk partition list --select id,id
```

### List partition records with filtering and ordering

```bash
csdk partition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a partition

```bash
csdk partition create --databaseId <UUID> --tableId <UUID> --strategy <String> --partitionKeyId <UUID> [--interval <String>] [--retention <String>] [--retentionKeepTable <Boolean>] [--premake <Int>] [--namingPattern <String>]
```

### Get a partition by id

```bash
csdk partition get --id <value>
```
