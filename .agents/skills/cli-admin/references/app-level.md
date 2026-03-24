# appLevel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLevel records via csdk CLI

## Usage

```bash
csdk app-level list
csdk app-level get --id <UUID>
csdk app-level create --name <String> [--description <String>] [--image <Image>] [--ownerId <UUID>]
csdk app-level update --id <UUID> [--name <String>] [--description <String>] [--image <Image>] [--ownerId <UUID>]
csdk app-level delete --id <UUID>
```

## Examples

### List all appLevel records

```bash
csdk app-level list
```

### Create a appLevel

```bash
csdk app-level create --name <String> [--description <String>] [--image <Image>] [--ownerId <UUID>]
```

### Get a appLevel by id

```bash
csdk app-level get --id <value>
```
