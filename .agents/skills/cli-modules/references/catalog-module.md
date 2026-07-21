# catalogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for CatalogModule records via csdk CLI

## Usage

```bash
csdk catalog-module list
csdk catalog-module list --where.<field>.<op> <value> --orderBy <values>
csdk catalog-module list --limit 10 --after <cursor>
csdk catalog-module find-first --where.<field>.<op> <value>
csdk catalog-module get --id <UUID>
csdk catalog-module create --databaseId <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--defaultPermissions <String>] [--domainsTableId <UUID>] [--domainsTableName <String>] [--entityTableId <UUID>] [--functionsTableId <UUID>] [--functionsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceDefinitionsTableId <UUID>] [--resourceDefinitionsTableName <String>] [--resourceInstallationsTableId <UUID>] [--resourceInstallationsTableName <String>] [--resourcesTableId <UUID>] [--resourcesTableName <String>] [--schemaId <UUID>] [--scope <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
csdk catalog-module update --id <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--domainsTableId <UUID>] [--domainsTableName <String>] [--entityTableId <UUID>] [--functionsTableId <UUID>] [--functionsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceDefinitionsTableId <UUID>] [--resourceDefinitionsTableName <String>] [--resourceInstallationsTableId <UUID>] [--resourceInstallationsTableName <String>] [--resourcesTableId <UUID>] [--resourcesTableName <String>] [--schemaId <UUID>] [--scope <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
csdk catalog-module delete --id <UUID>
```

## Examples

### List catalogModule records

```bash
csdk catalog-module list
```

### List catalogModule records with pagination

```bash
csdk catalog-module list --limit 10 --offset 0
```

### List catalogModule records with cursor pagination

```bash
csdk catalog-module list --limit 10 --after <cursor>
```

### Find first matching catalogModule

```bash
csdk catalog-module find-first --where.id.equalTo <value>
```

### List catalogModule records with field selection

```bash
csdk catalog-module list --select id,id
```

### List catalogModule records with filtering and ordering

```bash
csdk catalog-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a catalogModule

```bash
csdk catalog-module create --databaseId <UUID> [--apiName <String>] [--apisTableId <UUID>] [--apisTableName <String>] [--appsTableId <UUID>] [--appsTableName <String>] [--defaultPermissions <String>] [--domainsTableId <UUID>] [--domainsTableName <String>] [--entityTableId <UUID>] [--functionsTableId <UUID>] [--functionsTableName <String>] [--namespacesTableId <UUID>] [--namespacesTableName <String>] [--policies <JSON>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceDefinitionsTableId <UUID>] [--resourceDefinitionsTableName <String>] [--resourceInstallationsTableId <UUID>] [--resourceInstallationsTableName <String>] [--resourcesTableId <UUID>] [--resourcesTableName <String>] [--schemaId <UUID>] [--scope <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
```

### Get a catalogModule by id

```bash
csdk catalog-module get --id <value>
```
