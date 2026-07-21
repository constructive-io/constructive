# siteSurfaceModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SiteSurfaceModule records via csdk CLI

## Usage

```bash
csdk site-surface-module list
csdk site-surface-module list --where.<field>.<op> <value> --orderBy <values>
csdk site-surface-module list --limit 10 --after <cursor>
csdk site-surface-module find-first --where.<field>.<op> <value>
csdk site-surface-module get --id <UUID>
csdk site-surface-module create --databaseId <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--siteMetadataTableId <UUID>] [--siteMetadataTableName <String>] [--siteModulesTableId <UUID>] [--siteModulesTableName <String>] [--siteThemesTableId <UUID>] [--siteThemesTableName <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
csdk site-surface-module update --id <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--siteMetadataTableId <UUID>] [--siteMetadataTableName <String>] [--siteModulesTableId <UUID>] [--siteModulesTableName <String>] [--siteThemesTableId <UUID>] [--siteThemesTableName <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
csdk site-surface-module delete --id <UUID>
```

## Examples

### List siteSurfaceModule records

```bash
csdk site-surface-module list
```

### List siteSurfaceModule records with pagination

```bash
csdk site-surface-module list --limit 10 --offset 0
```

### List siteSurfaceModule records with cursor pagination

```bash
csdk site-surface-module list --limit 10 --after <cursor>
```

### Find first matching siteSurfaceModule

```bash
csdk site-surface-module find-first --where.id.equalTo <value>
```

### List siteSurfaceModule records with field selection

```bash
csdk site-surface-module list --select id,id
```

### List siteSurfaceModule records with filtering and ordering

```bash
csdk site-surface-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a siteSurfaceModule

```bash
csdk site-surface-module create --databaseId <UUID> [--apiName <String>] [--catalogModuleId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--siteMetadataTableId <UUID>] [--siteMetadataTableName <String>] [--siteModulesTableId <UUID>] [--siteModulesTableName <String>] [--siteThemesTableId <UUID>] [--siteThemesTableName <String>] [--sitesTableId <UUID>] [--sitesTableName <String>]
```

### Get a siteSurfaceModule by id

```bash
csdk site-surface-module get --id <value>
```
