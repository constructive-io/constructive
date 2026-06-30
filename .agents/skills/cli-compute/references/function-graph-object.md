# functionGraphObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionGraphObject records via csdk CLI

## Usage

```bash
csdk function-graph-object list
csdk function-graph-object list --where.<field>.<op> <value> --orderBy <values>
csdk function-graph-object list --limit 10 --after <cursor>
csdk function-graph-object find-first --where.<field>.<op> <value>
csdk function-graph-object get --id <UUID>
csdk function-graph-object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>]
csdk function-graph-object update --id <UUID> [--databaseId <UUID>] [--kids <UUID>] [--ktree <String>] [--data <JSON>]
csdk function-graph-object delete --id <UUID>
```

## Examples

### List functionGraphObject records

```bash
csdk function-graph-object list
```

### List functionGraphObject records with pagination

```bash
csdk function-graph-object list --limit 10 --offset 0
```

### List functionGraphObject records with cursor pagination

```bash
csdk function-graph-object list --limit 10 --after <cursor>
```

### Find first matching functionGraphObject

```bash
csdk function-graph-object find-first --where.id.equalTo <value>
```

### List functionGraphObject records with field selection

```bash
csdk function-graph-object list --select id,id
```

### List functionGraphObject records with filtering and ordering

```bash
csdk function-graph-object list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionGraphObject

```bash
csdk function-graph-object create --databaseId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>]
```

### Get a functionGraphObject by id

```bash
csdk function-graph-object get --id <value>
```
