# platformInfraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInfraObject records via csdk CLI

## Usage

```bash
csdk platform-infra-object list
csdk platform-infra-object list --where.<field>.<op> <value> --orderBy <values>
csdk platform-infra-object list --limit 10 --after <cursor>
csdk platform-infra-object find-first --where.<field>.<op> <value>
csdk platform-infra-object get --id <UUID>
csdk platform-infra-object create --scopeId <UUID> [--data <JSON>] [--kids <UUID>] [--ktree <String>]
csdk platform-infra-object update --id <UUID> [--data <JSON>] [--kids <UUID>] [--ktree <String>] [--scopeId <UUID>]
csdk platform-infra-object delete --id <UUID>
```

## Examples

### List platformInfraObject records

```bash
csdk platform-infra-object list
```

### List platformInfraObject records with pagination

```bash
csdk platform-infra-object list --limit 10 --offset 0
```

### List platformInfraObject records with cursor pagination

```bash
csdk platform-infra-object list --limit 10 --after <cursor>
```

### Find first matching platformInfraObject

```bash
csdk platform-infra-object find-first --where.id.equalTo <value>
```

### List platformInfraObject records with field selection

```bash
csdk platform-infra-object list --select id,id
```

### List platformInfraObject records with filtering and ordering

```bash
csdk platform-infra-object list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInfraObject

```bash
csdk platform-infra-object create --scopeId <UUID> [--data <JSON>] [--kids <UUID>] [--ktree <String>]
```

### Get a platformInfraObject by id

```bash
csdk platform-infra-object get --id <value>
```
