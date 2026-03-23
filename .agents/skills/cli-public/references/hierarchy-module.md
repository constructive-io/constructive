# hierarchyModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for HierarchyModule records via csdk CLI

## Usage

```bash
csdk hierarchy-module list
csdk hierarchy-module get --id <UUID>
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
csdk hierarchy-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--entityTableId <UUID>] [--usersTableId <UUID>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
csdk hierarchy-module delete --id <UUID>
```

## Examples

### List all hierarchyModule records

```bash
csdk hierarchy-module list
```

### Create a hierarchyModule

```bash
csdk hierarchy-module create --databaseId <UUID> --entityTableId <UUID> --usersTableId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--chartEdgesTableId <UUID>] [--chartEdgesTableName <String>] [--hierarchySprtTableId <UUID>] [--hierarchySprtTableName <String>] [--chartEdgeGrantsTableId <UUID>] [--chartEdgeGrantsTableName <String>] [--prefix <String>] [--privateSchemaName <String>] [--sprtTableName <String>] [--rebuildHierarchyFunction <String>] [--getSubordinatesFunction <String>] [--getManagersFunction <String>] [--isManagerOfFunction <String>]
```

### Get a hierarchyModule by id

```bash
csdk hierarchy-module get --id <value>
```
