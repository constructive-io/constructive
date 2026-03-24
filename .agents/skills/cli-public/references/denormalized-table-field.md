# denormalizedTableField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DenormalizedTableField records via csdk CLI

## Usage

```bash
csdk denormalized-table-field list
csdk denormalized-table-field get --id <UUID>
csdk denormalized-table-field create --databaseId <UUID> --tableId <UUID> --fieldId <UUID> --refTableId <UUID> --refFieldId <UUID> [--setIds <UUID>] [--refIds <UUID>] [--useUpdates <Boolean>] [--updateDefaults <Boolean>] [--funcName <String>] [--funcOrder <Int>]
csdk denormalized-table-field update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--setIds <UUID>] [--refTableId <UUID>] [--refFieldId <UUID>] [--refIds <UUID>] [--useUpdates <Boolean>] [--updateDefaults <Boolean>] [--funcName <String>] [--funcOrder <Int>]
csdk denormalized-table-field delete --id <UUID>
```

## Examples

### List all denormalizedTableField records

```bash
csdk denormalized-table-field list
```

### Create a denormalizedTableField

```bash
csdk denormalized-table-field create --databaseId <UUID> --tableId <UUID> --fieldId <UUID> --refTableId <UUID> --refFieldId <UUID> [--setIds <UUID>] [--refIds <UUID>] [--useUpdates <Boolean>] [--updateDefaults <Boolean>] [--funcName <String>] [--funcOrder <Int>]
```

### Get a denormalizedTableField by id

```bash
csdk denormalized-table-field get --id <value>
```
