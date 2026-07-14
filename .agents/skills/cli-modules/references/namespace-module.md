# namespaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for NamespaceModule records via csdk CLI

## Usage

```bash
csdk namespace-module list
csdk namespace-module list --where.<field>.<op> <value> --orderBy <values>
csdk namespace-module list --limit 10 --after <cursor>
csdk namespace-module find-first --where.<field>.<op> <value>
csdk namespace-module get --id <UUID>
csdk namespace-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--namespaceEventsTableId <UUID>] [--namespaceEventsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk namespace-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--namespaceEventsTableId <UUID>] [--namespaceEventsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk namespace-module delete --id <UUID>
```

## Examples

### List namespaceModule records

```bash
csdk namespace-module list
```

### List namespaceModule records with pagination

```bash
csdk namespace-module list --limit 10 --offset 0
```

### List namespaceModule records with cursor pagination

```bash
csdk namespace-module list --limit 10 --after <cursor>
```

### Find first matching namespaceModule

```bash
csdk namespace-module find-first --where.id.equalTo <value>
```

### List namespaceModule records with field selection

```bash
csdk namespace-module list --select id,id
```

### List namespaceModule records with filtering and ordering

```bash
csdk namespace-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a namespaceModule

```bash
csdk namespace-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--namespaceEventsTableId <UUID>] [--namespaceEventsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a namespaceModule by id

```bash
csdk namespace-module get --id <value>
```
