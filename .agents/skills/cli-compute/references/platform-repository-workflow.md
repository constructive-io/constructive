# platformRepositoryWorkflow

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRepositoryWorkflow records via csdk CLI

## Usage

```bash
csdk platform-repository-workflow list
csdk platform-repository-workflow list --where.<field>.<op> <value> --orderBy <values>
csdk platform-repository-workflow list --limit 10 --after <cursor>
csdk platform-repository-workflow find-first --where.<field>.<op> <value>
csdk platform-repository-workflow get --id <UUID>
csdk platform-repository-workflow create --eventType <String> --name <String> --repositoryId <UUID> --slug <String> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--refPattern <String>] [--requiredSecrets <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-repository-workflow update --id <UUID> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--eventType <String>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--name <String>] [--refPattern <String>] [--repositoryId <UUID>] [--requiredSecrets <String>] [--slug <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-repository-workflow delete --id <UUID>
```

## Examples

### List platformRepositoryWorkflow records

```bash
csdk platform-repository-workflow list
```

### List platformRepositoryWorkflow records with pagination

```bash
csdk platform-repository-workflow list --limit 10 --offset 0
```

### List platformRepositoryWorkflow records with cursor pagination

```bash
csdk platform-repository-workflow list --limit 10 --after <cursor>
```

### Find first matching platformRepositoryWorkflow

```bash
csdk platform-repository-workflow find-first --where.id.equalTo <value>
```

### List platformRepositoryWorkflow records with field selection

```bash
csdk platform-repository-workflow list --select id,id
```

### List platformRepositoryWorkflow records with filtering and ordering

```bash
csdk platform-repository-workflow list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRepositoryWorkflow

```bash
csdk platform-repository-workflow create --eventType <String> --name <String> --repositoryId <UUID> --slug <String> [--cancelInProgress <Boolean>] [--concurrencyKey <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--graphId <UUID>] [--inputs <JSON>] [--isEnabled <Boolean>] [--refPattern <String>] [--requiredSecrets <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformRepositoryWorkflow by id

```bash
csdk platform-repository-workflow get --id <value>
```
