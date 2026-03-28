# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for HierarchyModule records via csdk CLI

## Usage

```bash
csdk hierarchy-module list
csdk hierarchy-module list --where.<field>.<op> <value> --orderBy <values>
csdk hierarchy-module list --limit 10 --after <cursor>
csdk hierarchy-module find-first --where.<field>.<op> <value>
csdk hierarchy-module get --id <UUID>
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
csdk hierarchy-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--entityTableId <UUID>] [--usersTableId <UUID>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
csdk hierarchy-module delete --id <UUID>
```

## Examples

### List hierarchyModule records

```bash
csdk hierarchy-module list
```

### List hierarchyModule records with pagination

```bash
csdk hierarchy-module list --limit 10 --offset 0
```

### List hierarchyModule records with cursor pagination

```bash
csdk hierarchy-module list --limit 10 --after <cursor>
```

### Find first matching hierarchyModule

```bash
csdk hierarchy-module find-first --where.id.equalTo <value>
```

### List hierarchyModule records with field selection

```bash
csdk hierarchy-module list --select id,id
```

### List hierarchyModule records with filtering and ordering

```bash
csdk hierarchy-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a hierarchyModule

```bash
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
```

### Get a hierarchyModule by id

```bash
csdk hierarchy-module get --id <value>
```
