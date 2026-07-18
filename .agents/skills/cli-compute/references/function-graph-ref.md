# functionGraphRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphRef records via csdk CLI

## Usage

```bash
csdk function-graph-ref list
csdk function-graph-ref list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-ref list --limit 10 --after <cursor>
csdk function-graph-ref find-first --where.<field>.<op> <value>
csdk function-graph-ref get --id <UUID>
csdk function-graph-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
csdk function-graph-ref update --id <UUID> [--commitId <UUID>] [--name <String>] [--scopeId <UUID>] [--storeId <UUID>]
csdk function-graph-ref delete --id <UUID>
```

## Examples

### List functionGraphRef records

```bash
csdk function-graph-ref list
```

### List functionGraphRef records with pagination

```bash
csdk function-graph-ref list --limit 10 --offset 0
```

### List functionGraphRef records with cursor pagination

```bash
csdk function-graph-ref list --limit 10 --after <cursor>
```

### Find first matching functionGraphRef

```bash
csdk function-graph-ref find-first --where.id.equalTo <value>
```

### List functionGraphRef records with field selection

```bash
csdk function-graph-ref list --select id,id
```

### List functionGraphRef records with filtering and ordering

```bash
csdk function-graph-ref list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphRef

```bash
csdk function-graph-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
```

### Get a functionGraphRef by id

```bash
csdk function-graph-ref get --id <value>
```
