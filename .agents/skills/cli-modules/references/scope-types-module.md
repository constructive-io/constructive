# scopeTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ScopeTypesModule records via csdk CLI

## Usage

```bash
csdk scope-types-module list
csdk scope-types-module list --where.<field>.<op> <value> --orderBy <values>
csdk scope-types-module list --limit 10 --after <cursor>
csdk scope-types-module find-first --where.<field>.<op> <value>
csdk scope-types-module get --id <UUID>
csdk scope-types-module create --databaseId <UUID> [--privateSchemaName <String>] [--schemaId <UUID>] [--scopeTypesTableId <UUID>]
csdk scope-types-module update --id <UUID> [--databaseId <UUID>] [--privateSchemaName <String>] [--schemaId <UUID>] [--scopeTypesTableId <UUID>]
csdk scope-types-module delete --id <UUID>
```

## Examples

### List scopeTypesModule records

```bash
csdk scope-types-module list
```

### List scopeTypesModule records with pagination

```bash
csdk scope-types-module list --limit 10 --offset 0
```

### List scopeTypesModule records with cursor pagination

```bash
csdk scope-types-module list --limit 10 --after <cursor>
```

### Find first matching scopeTypesModule

```bash
csdk scope-types-module find-first --where.id.equalTo <value>
```

### List scopeTypesModule records with field selection

```bash
csdk scope-types-module list --select id,id
```

### List scopeTypesModule records with filtering and ordering

```bash
csdk scope-types-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a scopeTypesModule

```bash
csdk scope-types-module create --databaseId <UUID> [--privateSchemaName <String>] [--schemaId <UUID>] [--scopeTypesTableId <UUID>]
```

### Get a scopeTypesModule by id

```bash
csdk scope-types-module get --id <value>
```
