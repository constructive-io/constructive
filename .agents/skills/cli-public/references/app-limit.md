# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLimit records via csdk CLI

## Usage

```bash
csdk app-limit list
csdk app-limit get --id <UUID>
csdk app-limit create --actorId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
csdk app-limit update --id <UUID> [--name <String>] [--actorId <UUID>] [--num <Int>] [--max <Int>]
csdk app-limit delete --id <UUID>
```

## Examples

### List all appLimit records

```bash
csdk app-limit list
```

### Create a appLimit

```bash
csdk app-limit create --actorId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
```

### Get a appLimit by id

```bash
csdk app-limit get --id <value>
```
