# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DenormalizedTableField records via csdk CLI

## Usage

```bash
csdk denormalized-table-field list
csdk denormalized-table-field list --where.<field>.<op> <value> --orderBy <values>
csdk denormalized-table-field list --limit 10 --after <cursor>
csdk denormalized-table-field find-first --where.<field>.<op> <value>
csdk denormalized-table-field get --id <UUID>
csdk denormalized-table-field create --databaseId <UUID> --fieldId <UUID> --refFieldId <UUID> --refTableId <UUID> --tableId <UUID> [--funcName <String>] [--funcOrder <Int>] [--refIds <UUID>] [--setIds <UUID>] [--updateDefaults <Boolean>] [--useUpdates <Boolean>]
csdk denormalized-table-field update --id <UUID> [--databaseId <UUID>] [--fieldId <UUID>] [--funcName <String>] [--funcOrder <Int>] [--refFieldId <UUID>] [--refIds <UUID>] [--refTableId <UUID>] [--setIds <UUID>] [--tableId <UUID>] [--updateDefaults <Boolean>] [--useUpdates <Boolean>]
csdk denormalized-table-field delete --id <UUID>
```

## Examples

### List denormalizedTableField records

```bash
csdk denormalized-table-field list
```

### List denormalizedTableField records with pagination

```bash
csdk denormalized-table-field list --limit 10 --offset 0
```

### List denormalizedTableField records with cursor pagination

```bash
csdk denormalized-table-field list --limit 10 --after <cursor>
```

### Find first matching denormalizedTableField

```bash
csdk denormalized-table-field find-first --where.id.equalTo <value>
```

### List denormalizedTableField records with field selection

```bash
csdk denormalized-table-field list --select id,id
```

### List denormalizedTableField records with filtering and ordering

```bash
csdk denormalized-table-field list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a denormalizedTableField

```bash
csdk denormalized-table-field create --databaseId <UUID> --fieldId <UUID> --refFieldId <UUID> --refTableId <UUID> --tableId <UUID> [--funcName <String>] [--funcOrder <Int>] [--refIds <UUID>] [--setIds <UUID>] [--updateDefaults <Boolean>] [--useUpdates <Boolean>]
```

### Get a denormalizedTableField by id

```bash
csdk denormalized-table-field get --id <value>
```
