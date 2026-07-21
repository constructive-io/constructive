# platformInfraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInfraCommit records via csdk CLI

## Usage

```bash
csdk platform-infra-commit list
csdk platform-infra-commit list --where.<field>.<op> <value> --orderBy <values>
csdk platform-infra-commit list --limit 10 --after <cursor>
csdk platform-infra-commit find-first --where.<field>.<op> <value>
csdk platform-infra-commit get --id <UUID>
csdk platform-infra-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
csdk platform-infra-commit update --id <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--scopeId <UUID>] [--storeId <UUID>] [--treeId <UUID>]
csdk platform-infra-commit delete --id <UUID>
```

## Examples

### List platformInfraCommit records

```bash
csdk platform-infra-commit list
```

### List platformInfraCommit records with pagination

```bash
csdk platform-infra-commit list --limit 10 --offset 0
```

### List platformInfraCommit records with cursor pagination

```bash
csdk platform-infra-commit list --limit 10 --after <cursor>
```

### Find first matching platformInfraCommit

```bash
csdk platform-infra-commit find-first --where.id.equalTo <value>
```

### List platformInfraCommit records with field selection

```bash
csdk platform-infra-commit list --select id,id
```

### List platformInfraCommit records with filtering and ordering

```bash
csdk platform-infra-commit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInfraCommit

```bash
csdk platform-infra-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
```

### Get a platformInfraCommit by id

```bash
csdk platform-infra-commit get --id <value>
```
