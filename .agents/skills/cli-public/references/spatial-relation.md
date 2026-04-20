# spatialRelation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SpatialRelation records via csdk CLI

## Usage

```bash
csdk spatial-relation list
csdk spatial-relation list --where.<field>.<op> <value> --orderBy <values>
csdk spatial-relation list --limit 10 --after <cursor>
csdk spatial-relation find-first --where.<field>.<op> <value>
csdk spatial-relation get --id <UUID>
csdk spatial-relation create --tableId <UUID> --fieldId <UUID> --refTableId <UUID> --refFieldId <UUID> --name <String> --operator <String> [--databaseId <UUID>] [--paramName <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk spatial-relation update --id <UUID> [--databaseId <UUID>] [--tableId <UUID>] [--fieldId <UUID>] [--refTableId <UUID>] [--refFieldId <UUID>] [--name <String>] [--operator <String>] [--paramName <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
csdk spatial-relation delete --id <UUID>
```

## Examples

### List spatialRelation records

```bash
csdk spatial-relation list
```

### List spatialRelation records with pagination

```bash
csdk spatial-relation list --limit 10 --offset 0
```

### List spatialRelation records with cursor pagination

```bash
csdk spatial-relation list --limit 10 --after <cursor>
```

### Find first matching spatialRelation

```bash
csdk spatial-relation find-first --where.id.equalTo <value>
```

### List spatialRelation records with field selection

```bash
csdk spatial-relation list --select id,id
```

### List spatialRelation records with filtering and ordering

```bash
csdk spatial-relation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a spatialRelation

```bash
csdk spatial-relation create --tableId <UUID> --fieldId <UUID> --refTableId <UUID> --refFieldId <UUID> --name <String> --operator <String> [--databaseId <UUID>] [--paramName <String>] [--category <ObjectCategory>] [--module <String>] [--scope <Int>] [--tags <String>]
```

### Get a spatialRelation by id

```bash
csdk spatial-relation get --id <value>
```
