# repositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RepositoryWorkflow records via csdk CLI

## Usage

```bash
csdk repository-workflow list
csdk repository-workflow list --where.<field>.<op> <value> --orderBy <values>
csdk repository-workflow list --limit 10 --after <cursor>
csdk repository-workflow find-first --where.<field>.<op> <value>
csdk repository-workflow get --id <UUID>
csdk repository-workflow create --databaseId <UUID> --eventType <String> --name <String> --repositoryId <UUID> --slug <String> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--refPattern <String>] [--requiredSecrets <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk repository-workflow update --id <UUID> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--eventType <String>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--name <String>] [--refPattern <String>] [--repositoryId <UUID>] [--requiredSecrets <String>] [--slug <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk repository-workflow delete --id <UUID>
```

## Examples

### List repositoryWorkflow records

```bash
csdk repository-workflow list
```

### List repositoryWorkflow records with pagination

```bash
csdk repository-workflow list --limit 10 --offset 0
```

### List repositoryWorkflow records with cursor pagination

```bash
csdk repository-workflow list --limit 10 --after <cursor>
```

### Find first matching repositoryWorkflow

```bash
csdk repository-workflow find-first --where.id.equalTo <value>
```

### List repositoryWorkflow records with field selection

```bash
csdk repository-workflow list --select id,id
```

### List repositoryWorkflow records with filtering and ordering

```bash
csdk repository-workflow list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a repositoryWorkflow

```bash
csdk repository-workflow create --databaseId <UUID> --eventType <String> --name <String> --repositoryId <UUID> --slug <String> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--refPattern <String>] [--requiredSecrets <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a repositoryWorkflow by id

```bash
csdk repository-workflow get --id <value>
```
