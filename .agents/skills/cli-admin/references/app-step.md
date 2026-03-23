# appStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppStep records via csdk CLI

## Usage

```bash
csdk app-step list
csdk app-step get --id <UUID>
csdk app-step create --name <String> [--actorId <UUID>] [--count <Int>]
csdk app-step update --id <UUID> [--actorId <UUID>] [--name <String>] [--count <Int>]
csdk app-step delete --id <UUID>
```

## Examples

### List all appStep records

```bash
csdk app-step list
```

### Create a appStep

```bash
csdk app-step create --name <String> [--actorId <UUID>] [--count <Int>]
```

### Get a appStep by id

```bash
csdk app-step get --id <value>
```
