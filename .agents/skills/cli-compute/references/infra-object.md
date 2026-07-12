# infraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraObject records via csdk CLI

## Usage

```bash
csdk infra-object list
csdk infra-object list --where.<field>.<op> <value> --orderBy <values>
csdk infra-object list --limit 10 --after <cursor>
csdk infra-object find-first --where.<field>.<op> <value>
csdk infra-object get --id <UUID>
csdk infra-object create --scopeId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>]
csdk infra-object update --id <UUID> [--scopeId <UUID>] [--kids <UUID>] [--ktree <String>] [--data <JSON>]
csdk infra-object delete --id <UUID>
```

## Examples

### List infraObject records

```bash
csdk infra-object list
```

### List infraObject records with pagination

```bash
csdk infra-object list --limit 10 --offset 0
```

### List infraObject records with cursor pagination

```bash
csdk infra-object list --limit 10 --after <cursor>
```

### Find first matching infraObject

```bash
csdk infra-object find-first --where.id.equalTo <value>
```

### List infraObject records with field selection

```bash
csdk infra-object list --select id,id
```

### List infraObject records with filtering and ordering

```bash
csdk infra-object list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraObject

```bash
csdk infra-object create --scopeId <UUID> [--kids <UUID>] [--ktree <String>] [--data <JSON>]
```

### Get a infraObject by id

```bash
csdk infra-object get --id <value>
```
