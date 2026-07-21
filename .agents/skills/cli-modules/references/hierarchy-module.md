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
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--defaultPermissions <String>] [--entityField <String>] [--getManagersFunction <String>] [--getSubordinatesFunction <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--isManagerOfFunction <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--rebuildHierarchyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableName <String>]
csdk hierarchy-module update --id <UUID> [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--getManagersFunction <String>] [--getSubordinatesFunction <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--isManagerOfFunction <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--rebuildHierarchyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableName <String>] [--usersTableId <UUID>]
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
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--defaultPermissions <String>] [--entityField <String>] [--getManagersFunction <String>] [--getSubordinatesFunction <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--isManagerOfFunction <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--rebuildHierarchyFunction <String>] [--schemaId <UUID>] [--scope <String>] [--sprtTableName <String>]
```

### Get a hierarchyModule by id

```bash
csdk hierarchy-module get --id <value>
```
