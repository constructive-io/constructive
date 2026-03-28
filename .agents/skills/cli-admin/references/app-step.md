# appStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppStep records via csdk CLI

## Usage

```bash
csdk app-step list
csdk app-step list --where.<field>.<op> <value> --orderBy <values>
csdk app-step list --limit 10 --after <cursor>
csdk app-step find-first --where.<field>.<op> <value>
csdk app-step get --id <UUID>
csdk app-step create --name <String> [--actorId <UUID>] [--count <Int>]
csdk app-step update --id <UUID> [--actorId <UUID>] [--name <String>] [--count <Int>]
csdk app-step delete --id <UUID>
```

## Examples

### List appStep records

```bash
csdk app-step list
```

### List appStep records with pagination

```bash
csdk app-step list --limit 10 --offset 0
```

### List appStep records with cursor pagination

```bash
csdk app-step list --limit 10 --after <cursor>
```

### Find first matching appStep

```bash
csdk app-step find-first --where.id.equalTo <value>
```

### List appStep records with field selection

```bash
csdk app-step list --select id,id
```

### List appStep records with filtering and ordering

```bash
csdk app-step list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appStep

```bash
csdk app-step create --name <String> [--actorId <UUID>] [--count <Int>]
```

### Get a appStep by id

```bash
csdk app-step get --id <value>
```
