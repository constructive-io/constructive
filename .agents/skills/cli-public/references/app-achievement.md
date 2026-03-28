# appAchievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppAchievement records via csdk CLI

## Usage

```bash
csdk app-achievement list
csdk app-achievement list --where.<field>.<op> <value> --orderBy <values>
csdk app-achievement list --limit 10 --after <cursor>
csdk app-achievement find-first --where.<field>.<op> <value>
csdk app-achievement get --id <UUID>
csdk app-achievement create --name <String> [--actorId <UUID>] [--count <Int>]
csdk app-achievement update --id <UUID> [--actorId <UUID>] [--name <String>] [--count <Int>]
csdk app-achievement delete --id <UUID>
```

## Examples

### List appAchievement records

```bash
csdk app-achievement list
```

### List appAchievement records with pagination

```bash
csdk app-achievement list --limit 10 --offset 0
```

### List appAchievement records with cursor pagination

```bash
csdk app-achievement list --limit 10 --after <cursor>
```

### Find first matching appAchievement

```bash
csdk app-achievement find-first --where.id.equalTo <value>
```

### List appAchievement records with field selection

```bash
csdk app-achievement list --select id,id
```

### List appAchievement records with filtering and ordering

```bash
csdk app-achievement list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appAchievement

```bash
csdk app-achievement create --name <String> [--actorId <UUID>] [--count <Int>]
```

### Get a appAchievement by id

```bash
csdk app-achievement get --id <value>
```
