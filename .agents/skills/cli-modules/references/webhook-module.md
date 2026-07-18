# webhookModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebhookModule records via csdk CLI

## Usage

```bash
csdk webhook-module list
csdk webhook-module list --where.<field>.<op> <value> --orderBy <values>
csdk webhook-module list --limit 10 --after <cursor>
csdk webhook-module find-first --where.<field>.<op> <value>
csdk webhook-module get --id <UUID>
csdk webhook-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionInvocationModuleId <UUID>] [--functionModuleId <UUID>] [--infraSecretsModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--webhookEndpointsTableId <UUID>] [--webhookEndpointsTableName <String>] [--webhookEventsTableId <UUID>] [--webhookEventsTableName <String>]
csdk webhook-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionInvocationModuleId <UUID>] [--functionModuleId <UUID>] [--infraSecretsModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--webhookEndpointsTableId <UUID>] [--webhookEndpointsTableName <String>] [--webhookEventsTableId <UUID>] [--webhookEventsTableName <String>]
csdk webhook-module delete --id <UUID>
```

## Examples

### List webhookModule records

```bash
csdk webhook-module list
```

### List webhookModule records with pagination

```bash
csdk webhook-module list --limit 10 --offset 0
```

### List webhookModule records with cursor pagination

```bash
csdk webhook-module list --limit 10 --after <cursor>
```

### Find first matching webhookModule

```bash
csdk webhook-module find-first --where.id.equalTo <value>
```

### List webhookModule records with field selection

```bash
csdk webhook-module list --select id,id
```

### List webhookModule records with filtering and ordering

```bash
csdk webhook-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webhookModule

```bash
csdk webhook-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionInvocationModuleId <UUID>] [--functionModuleId <UUID>] [--infraSecretsModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--webhookEndpointsTableId <UUID>] [--webhookEndpointsTableName <String>] [--webhookEventsTableId <UUID>] [--webhookEventsTableName <String>]
```

### Get a webhookModule by id

```bash
csdk webhook-module get --id <value>
```
