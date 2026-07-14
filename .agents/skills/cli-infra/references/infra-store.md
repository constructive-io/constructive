# infraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InfraStore records via csdk CLI

## Usage

```bash
csdk infra-store list
csdk infra-store list --where.<field>.<op> <value> --orderBy <values>
csdk infra-store list --limit 10 --after <cursor>
csdk infra-store find-first --where.<field>.<op> <value>
csdk infra-store get --id <UUID>
csdk infra-store create --name <String> --scopeId <UUID> [--hash <UUID>]
csdk infra-store update --id <UUID> [--hash <UUID>] [--name <String>] [--scopeId <UUID>]
csdk infra-store delete --id <UUID>
```

## Examples

### List infraStore records

```bash
csdk infra-store list
```

### List infraStore records with pagination

```bash
csdk infra-store list --limit 10 --offset 0
```

### List infraStore records with cursor pagination

```bash
csdk infra-store list --limit 10 --after <cursor>
```

### Find first matching infraStore

```bash
csdk infra-store find-first --where.id.equalTo <value>
```

### List infraStore records with field selection

```bash
csdk infra-store list --select id,id
```

### List infraStore records with filtering and ordering

```bash
csdk infra-store list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a infraStore

```bash
csdk infra-store create --name <String> --scopeId <UUID> [--hash <UUID>]
```

### Get a infraStore by id

```bash
csdk infra-store get --id <value>
```
