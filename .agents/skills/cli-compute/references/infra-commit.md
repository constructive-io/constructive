# infraCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraCommit records via csdk CLI

## Usage

```bash
csdk infra-commit list
csdk infra-commit list --where.<field>.<op> <value> --orderBy <values>
csdk infra-commit list --limit 10 --after <cursor>
csdk infra-commit find-first --where.<field>.<op> <value>
csdk infra-commit get --id <UUID>
csdk infra-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
csdk infra-commit update --id <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--scopeId <UUID>] [--storeId <UUID>] [--treeId <UUID>]
csdk infra-commit delete --id <UUID>
```

## Examples

### List infraCommit records

```bash
csdk infra-commit list
```

### List infraCommit records with pagination

```bash
csdk infra-commit list --limit 10 --offset 0
```

### List infraCommit records with cursor pagination

```bash
csdk infra-commit list --limit 10 --after <cursor>
```

### Find first matching infraCommit

```bash
csdk infra-commit find-first --where.id.equalTo <value>
```

### List infraCommit records with field selection

```bash
csdk infra-commit list --select id,id
```

### List infraCommit records with filtering and ordering

```bash
csdk infra-commit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraCommit

```bash
csdk infra-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
```

### Get a infraCommit by id

```bash
csdk infra-commit get --id <value>
```
