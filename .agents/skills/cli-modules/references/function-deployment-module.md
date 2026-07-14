# functionDeploymentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionDeploymentModule records via csdk CLI

## Usage

```bash
csdk function-deployment-module list
csdk function-deployment-module list --where.<field>.<op> <value> --orderBy <values>
csdk function-deployment-module list --limit 10 --after <cursor>
csdk function-deployment-module find-first --where.<field>.<op> <value>
csdk function-deployment-module get --id <UUID>
csdk function-deployment-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--deploymentEventsTableId <UUID>] [--deploymentEventsTableName <String>] [--deploymentsTableId <UUID>] [--deploymentsTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk function-deployment-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--deploymentEventsTableId <UUID>] [--deploymentEventsTableName <String>] [--deploymentsTableId <UUID>] [--deploymentsTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
csdk function-deployment-module delete --id <UUID>
```

## Examples

### List functionDeploymentModule records

```bash
csdk function-deployment-module list
```

### List functionDeploymentModule records with pagination

```bash
csdk function-deployment-module list --limit 10 --offset 0
```

### List functionDeploymentModule records with cursor pagination

```bash
csdk function-deployment-module list --limit 10 --after <cursor>
```

### Find first matching functionDeploymentModule

```bash
csdk function-deployment-module find-first --where.id.equalTo <value>
```

### List functionDeploymentModule records with field selection

```bash
csdk function-deployment-module list --select id,id
```

### List functionDeploymentModule records with filtering and ordering

```bash
csdk function-deployment-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionDeploymentModule

```bash
csdk function-deployment-module create --databaseId <UUID> [--apiName <String>] [--defaultPermissions <String>] [--deploymentEventsTableId <UUID>] [--deploymentEventsTableName <String>] [--deploymentsTableId <UUID>] [--deploymentsTableName <String>] [--entityField <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>]
```

### Get a functionDeploymentModule by id

```bash
csdk function-deployment-module get --id <value>
```
