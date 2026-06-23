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
csdk function-deployment-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--deploymentsTableId <UUID>] [--deploymentEventsTableId <UUID>] [--deploymentsTableName <String>] [--deploymentEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk function-deployment-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--deploymentsTableId <UUID>] [--deploymentEventsTableId <UUID>] [--deploymentsTableName <String>] [--deploymentEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
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
csdk function-deployment-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--deploymentsTableId <UUID>] [--deploymentEventsTableId <UUID>] [--deploymentsTableName <String>] [--deploymentEventsTableName <String>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--functionModuleId <UUID>] [--namespaceModuleId <UUID>] [--policies <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a functionDeploymentModule by id

```bash
csdk function-deployment-module get --id <value>
```
