# appLevel

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLevel records via csdk CLI

## Usage

```bash
csdk app-level list
csdk app-level list --where.<field>.<op> <value> --orderBy <values>
csdk app-level list --limit 10 --after <cursor>
csdk app-level find-first --where.<field>.<op> <value>
csdk app-level get --id <UUID>
csdk app-level create --name <String> [--description <String>] [--image <Image>] [--ownerId <UUID>]
csdk app-level update --id <UUID> [--name <String>] [--description <String>] [--image <Image>] [--ownerId <UUID>]
csdk app-level delete --id <UUID>
```

## Examples

### List appLevel records

```bash
csdk app-level list
```

### List appLevel records with pagination

```bash
csdk app-level list --limit 10 --offset 0
```

### List appLevel records with cursor pagination

```bash
csdk app-level list --limit 10 --after <cursor>
```

### Find first matching appLevel

```bash
csdk app-level find-first --where.id.equalTo <value>
```

### List appLevel records with field selection

```bash
csdk app-level list --select id,id
```

### List appLevel records with filtering and ordering

```bash
csdk app-level list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLevel

```bash
csdk app-level create --name <String> [--description <String>] [--image <Image>] [--ownerId <UUID>]
```

### Get a appLevel by id

```bash
csdk app-level get --id <value>
```
