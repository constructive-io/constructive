# infraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraRef records via csdk CLI

## Usage

```bash
csdk infra-ref list
csdk infra-ref list --where.<field>.<op> <value> --orderBy <values>
csdk infra-ref list --limit 10 --after <cursor>
csdk infra-ref find-first --where.<field>.<op> <value>
csdk infra-ref get --id <UUID>
csdk infra-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
csdk infra-ref update --id <UUID> [--commitId <UUID>] [--name <String>] [--scopeId <UUID>] [--storeId <UUID>]
csdk infra-ref delete --id <UUID>
```

## Examples

### List infraRef records

```bash
csdk infra-ref list
```

### List infraRef records with pagination

```bash
csdk infra-ref list --limit 10 --offset 0
```

### List infraRef records with cursor pagination

```bash
csdk infra-ref list --limit 10 --after <cursor>
```

### Find first matching infraRef

```bash
csdk infra-ref find-first --where.id.equalTo <value>
```

### List infraRef records with field selection

```bash
csdk infra-ref list --select id,id
```

### List infraRef records with filtering and ordering

```bash
csdk infra-ref list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraRef

```bash
csdk infra-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
```

### Get a infraRef by id

```bash
csdk infra-ref get --id <value>
```
