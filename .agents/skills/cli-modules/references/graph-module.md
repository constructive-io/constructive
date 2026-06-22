# graphModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for GraphModule records via csdk CLI

## Usage

```bash
csdk graph-module list
csdk graph-module list --where.<field>.<op> <value> --orderBy <values>
csdk graph-module list --limit 10 --after <cursor>
csdk graph-module find-first --where.<field>.<op> <value>
csdk graph-module get --id <UUID>
csdk graph-module create --databaseId <UUID> --merkleStoreModuleId <UUID> [--publicSchemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--scope <String>] [--prefix <String>] [--graphsTableId <UUID>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk graph-module update --id <UUID> [--databaseId <UUID>] [--publicSchemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--scope <String>] [--prefix <String>] [--merkleStoreModuleId <UUID>] [--graphsTableId <UUID>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk graph-module delete --id <UUID>
```

## Examples

### List graphModule records

```bash
csdk graph-module list
```

### List graphModule records with pagination

```bash
csdk graph-module list --limit 10 --offset 0
```

### List graphModule records with cursor pagination

```bash
csdk graph-module list --limit 10 --after <cursor>
```

### Find first matching graphModule

```bash
csdk graph-module find-first --where.id.equalTo <value>
```

### List graphModule records with field selection

```bash
csdk graph-module list --select id,id
```

### List graphModule records with filtering and ordering

```bash
csdk graph-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a graphModule

```bash
csdk graph-module create --databaseId <UUID> --merkleStoreModuleId <UUID> [--publicSchemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--scope <String>] [--prefix <String>] [--graphsTableId <UUID>] [--apiName <String>] [--privateApiName <String>] [--entityTableId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a graphModule by id

```bash
csdk graph-module get --id <value>
```
