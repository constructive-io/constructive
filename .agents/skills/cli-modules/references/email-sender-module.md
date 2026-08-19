# emailSenderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for EmailSenderModule records via csdk CLI

## Usage

```bash
csdk email-sender-module list
csdk email-sender-module list --where.<field>.<op> <value> --orderBy <values>
csdk email-sender-module list --limit 10 --after <cursor>
csdk email-sender-module find-first --where.<field>.<op> <value>
csdk email-sender-module get --id <UUID>
csdk email-sender-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--emailIdentitiesTableId <UUID>] [--emailIdentitiesTableName <String>] [--emailProviderAccountsTableId <UUID>] [--emailProviderAccountsTableName <String>] [--emailSiteIdentitiesTableId <UUID>] [--emailSiteIdentitiesTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--siteSurfaceModuleId <UUID>]
csdk email-sender-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultCapabilities <String>] [--emailIdentitiesTableId <UUID>] [--emailIdentitiesTableName <String>] [--emailProviderAccountsTableId <UUID>] [--emailProviderAccountsTableName <String>] [--emailSiteIdentitiesTableId <UUID>] [--emailSiteIdentitiesTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--siteSurfaceModuleId <UUID>]
csdk email-sender-module delete --id <UUID>
```

## Examples

### List emailSenderModule records

```bash
csdk email-sender-module list
```

### List emailSenderModule records with pagination

```bash
csdk email-sender-module list --limit 10 --offset 0
```

### List emailSenderModule records with cursor pagination

```bash
csdk email-sender-module list --limit 10 --after <cursor>
```

### Find first matching emailSenderModule

```bash
csdk email-sender-module find-first --where.id.equalTo <value>
```

### List emailSenderModule records with field selection

```bash
csdk email-sender-module list --select id,id
```

### List emailSenderModule records with filtering and ordering

```bash
csdk email-sender-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a emailSenderModule

```bash
csdk email-sender-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--defaultCapabilities <String>] [--emailIdentitiesTableId <UUID>] [--emailIdentitiesTableName <String>] [--emailProviderAccountsTableId <UUID>] [--emailProviderAccountsTableName <String>] [--emailSiteIdentitiesTableId <UUID>] [--emailSiteIdentitiesTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--siteSurfaceModuleId <UUID>]
```

### Get a emailSenderModule by id

```bash
csdk email-sender-module get --id <value>
```
