# appAchievement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppAchievement records via csdk CLI

## Usage

```bash
csdk app-achievement list
csdk app-achievement get --id <UUID>
csdk app-achievement create --name <String> [--actorId <UUID>] [--count <Int>]
csdk app-achievement update --id <UUID> [--actorId <UUID>] [--name <String>] [--count <Int>]
csdk app-achievement delete --id <UUID>
```

## Examples

### List all appAchievement records

```bash
csdk app-achievement list
```

### Create a appAchievement

```bash
csdk app-achievement create --name <String> [--actorId <UUID>] [--count <Int>]
```

### Get a appAchievement by id

```bash
csdk app-achievement get --id <value>
```
