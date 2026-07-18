# platformInfraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformInfraRef records via csdk CLI

## Usage

```bash
csdk platform-infra-ref list
csdk platform-infra-ref list --where.<field>.<op> <value> --orderBy <values>
csdk platform-infra-ref list --limit 10 --after <cursor>
csdk platform-infra-ref find-first --where.<field>.<op> <value>
csdk platform-infra-ref get --id <UUID>
csdk platform-infra-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
csdk platform-infra-ref update --id <UUID> [--commitId <UUID>] [--name <String>] [--scopeId <UUID>] [--storeId <UUID>]
csdk platform-infra-ref delete --id <UUID>
```

## Examples

### List platformInfraRef records

```bash
csdk platform-infra-ref list
```

### List platformInfraRef records with pagination

```bash
csdk platform-infra-ref list --limit 10 --offset 0
```

### List platformInfraRef records with cursor pagination

```bash
csdk platform-infra-ref list --limit 10 --after <cursor>
```

### Find first matching platformInfraRef

```bash
csdk platform-infra-ref find-first --where.id.equalTo <value>
```

### List platformInfraRef records with field selection

```bash
csdk platform-infra-ref list --select id,id
```

### List platformInfraRef records with filtering and ordering

```bash
csdk platform-infra-ref list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformInfraRef

```bash
csdk platform-infra-ref create --name <String> --scopeId <UUID> --storeId <UUID> [--commitId <UUID>]
```

### Get a platformInfraRef by id

```bash
csdk platform-infra-ref get --id <value>
```
