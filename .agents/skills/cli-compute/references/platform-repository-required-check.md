# platformRepositoryRequiredCheck

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRepositoryRequiredCheck records via csdk CLI

## Usage

```bash
csdk platform-repository-required-check list
csdk platform-repository-required-check list --where.<field>.<op> <value> --orderBy <values>
csdk platform-repository-required-check list --limit 10 --after <cursor>
csdk platform-repository-required-check find-first --where.<field>.<op> <value>
csdk platform-repository-required-check get --id <UUID>
csdk platform-repository-required-check create --repositoryId <UUID> --workflowId <UUID>
csdk platform-repository-required-check update --id <UUID> [--repositoryId <UUID>] [--workflowId <UUID>]
csdk platform-repository-required-check delete --id <UUID>
```

## Examples

### List platformRepositoryRequiredCheck records

```bash
csdk platform-repository-required-check list
```

### List platformRepositoryRequiredCheck records with pagination

```bash
csdk platform-repository-required-check list --limit 10 --offset 0
```

### List platformRepositoryRequiredCheck records with cursor pagination

```bash
csdk platform-repository-required-check list --limit 10 --after <cursor>
```

### Find first matching platformRepositoryRequiredCheck

```bash
csdk platform-repository-required-check find-first --where.id.equalTo <value>
```

### List platformRepositoryRequiredCheck records with field selection

```bash
csdk platform-repository-required-check list --select id,id
```

### List platformRepositoryRequiredCheck records with filtering and ordering

```bash
csdk platform-repository-required-check list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRepositoryRequiredCheck

```bash
csdk platform-repository-required-check create --repositoryId <UUID> --workflowId <UUID>
```

### Get a platformRepositoryRequiredCheck by id

```bash
csdk platform-repository-required-check get --id <value>
```
