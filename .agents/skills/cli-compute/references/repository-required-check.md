# repositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RepositoryRequiredCheck records via csdk CLI

## Usage

```bash
csdk repository-required-check list
csdk repository-required-check list --where.<field>.<op> <value> --orderBy <values>
csdk repository-required-check list --limit 10 --after <cursor>
csdk repository-required-check find-first --where.<field>.<op> <value>
csdk repository-required-check get --id <UUID>
csdk repository-required-check create --databaseId <UUID> --repositoryId <UUID> --workflowId <UUID>
csdk repository-required-check update --id <UUID> [--databaseId <UUID>] [--repositoryId <UUID>] [--workflowId <UUID>]
csdk repository-required-check delete --id <UUID>
```

## Examples

### List repositoryRequiredCheck records

```bash
csdk repository-required-check list
```

### List repositoryRequiredCheck records with pagination

```bash
csdk repository-required-check list --limit 10 --offset 0
```

### List repositoryRequiredCheck records with cursor pagination

```bash
csdk repository-required-check list --limit 10 --after <cursor>
```

### Find first matching repositoryRequiredCheck

```bash
csdk repository-required-check find-first --where.id.equalTo <value>
```

### List repositoryRequiredCheck records with field selection

```bash
csdk repository-required-check list --select id,id
```

### List repositoryRequiredCheck records with filtering and ordering

```bash
csdk repository-required-check list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a repositoryRequiredCheck

```bash
csdk repository-required-check create --databaseId <UUID> --repositoryId <UUID> --workflowId <UUID>
```

### Get a repositoryRequiredCheck by id

```bash
csdk repository-required-check get --id <value>
```
