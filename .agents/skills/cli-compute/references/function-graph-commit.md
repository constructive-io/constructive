# functionGraphCommit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphCommit records via csdk CLI

## Usage

```bash
csdk function-graph-commit list
csdk function-graph-commit list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-commit list --limit 10 --after <cursor>
csdk function-graph-commit find-first --where.<field>.<op> <value>
csdk function-graph-commit get --id <UUID>
csdk function-graph-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
csdk function-graph-commit update --id <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--scopeId <UUID>] [--storeId <UUID>] [--treeId <UUID>]
csdk function-graph-commit delete --id <UUID>
```

## Examples

### List functionGraphCommit records

```bash
csdk function-graph-commit list
```

### List functionGraphCommit records with pagination

```bash
csdk function-graph-commit list --limit 10 --offset 0
```

### List functionGraphCommit records with cursor pagination

```bash
csdk function-graph-commit list --limit 10 --after <cursor>
```

### Find first matching functionGraphCommit

```bash
csdk function-graph-commit find-first --where.id.equalTo <value>
```

### List functionGraphCommit records with field selection

```bash
csdk function-graph-commit list --select id,id
```

### List functionGraphCommit records with filtering and ordering

```bash
csdk function-graph-commit list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphCommit

```bash
csdk function-graph-commit create --scopeId <UUID> --storeId <UUID> [--authorId <UUID>] [--committerId <UUID>] [--date <Datetime>] [--message <String>] [--parentIds <UUID>] [--treeId <UUID>]
```

### Get a functionGraphCommit by id

```bash
csdk function-graph-commit get --id <value>
```
