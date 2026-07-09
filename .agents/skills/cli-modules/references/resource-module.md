# resourceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceModule records via csdk CLI

## Usage

```bash
csdk resource-module list
csdk resource-module list --where.<field>.<op> <value> --orderBy <values>
csdk resource-module list --limit 10 --after <cursor>
csdk resource-module find-first --where.<field>.<op> <value>
csdk resource-module get --id <UUID>
csdk resource-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--resourcesTableId <UUID>] [--resourceEventsTableId <UUID>] [--resourcesTableName <String>] [--resourceEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk resource-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--resourcesTableId <UUID>] [--resourceEventsTableId <UUID>] [--resourcesTableName <String>] [--resourceEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk resource-module delete --id <UUID>
```

## Examples

### List resourceModule records

```bash
csdk resource-module list
```

### List resourceModule records with pagination

```bash
csdk resource-module list --limit 10 --offset 0
```

### List resourceModule records with cursor pagination

```bash
csdk resource-module list --limit 10 --after <cursor>
```

### Find first matching resourceModule

```bash
csdk resource-module find-first --where.id.equalTo <value>
```

### List resourceModule records with field selection

```bash
csdk resource-module list --select id,id
```

### List resourceModule records with filtering and ordering

```bash
csdk resource-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceModule

```bash
csdk resource-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--resourcesTableId <UUID>] [--resourceEventsTableId <UUID>] [--resourcesTableName <String>] [--resourceEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a resourceModule by id

```bash
csdk resource-module get --id <value>
```
