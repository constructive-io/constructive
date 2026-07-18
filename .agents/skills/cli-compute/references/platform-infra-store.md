# platformInfraStore

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInfraStore records via csdk CLI

## Usage

```bash
csdk platform-infra-store list
csdk platform-infra-store list --where.<field>.<op> <value> --orderBy <values>
csdk platform-infra-store list --limit 10 --after <cursor>
csdk platform-infra-store find-first --where.<field>.<op> <value>
csdk platform-infra-store get --id <UUID>
csdk platform-infra-store create --name <String> --scopeId <UUID> [--hash <UUID>]
csdk platform-infra-store update --id <UUID> [--hash <UUID>] [--name <String>] [--scopeId <UUID>]
csdk platform-infra-store delete --id <UUID>
```

## Examples

### List platformInfraStore records

```bash
csdk platform-infra-store list
```

### List platformInfraStore records with pagination

```bash
csdk platform-infra-store list --limit 10 --offset 0
```

### List platformInfraStore records with cursor pagination

```bash
csdk platform-infra-store list --limit 10 --after <cursor>
```

### Find first matching platformInfraStore

```bash
csdk platform-infra-store find-first --where.id.equalTo <value>
```

### List platformInfraStore records with field selection

```bash
csdk platform-infra-store list --select id,id
```

### List platformInfraStore records with filtering and ordering

```bash
csdk platform-infra-store list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInfraStore

```bash
csdk platform-infra-store create --name <String> --scopeId <UUID> [--hash <UUID>]
```

### Get a platformInfraStore by id

```bash
csdk platform-infra-store get --id <value>
```
