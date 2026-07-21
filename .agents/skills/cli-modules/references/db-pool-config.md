# dbPoolConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DbPoolConfig records via csdk CLI

## Usage

```bash
csdk db-pool-config list
csdk db-pool-config list --where.<field>.<op> <value> --orderBy <values>
csdk db-pool-config list --limit 10 --after <cursor>
csdk db-pool-config find-first --where.<field>.<op> <value>
csdk db-pool-config get --id <UUID>
csdk db-pool-config create --domain <String> --poolOwnerId <UUID> --presetSlug <String> [--enabled <Boolean>] [--max <Int>] [--min <Int>] [--warmTtl <Interval>]
csdk db-pool-config update --id <UUID> [--domain <String>] [--enabled <Boolean>] [--max <Int>] [--min <Int>] [--poolOwnerId <UUID>] [--presetSlug <String>] [--warmTtl <Interval>]
csdk db-pool-config delete --id <UUID>
```

## Examples

### List dbPoolConfig records

```bash
csdk db-pool-config list
```

### List dbPoolConfig records with pagination

```bash
csdk db-pool-config list --limit 10 --offset 0
```

### List dbPoolConfig records with cursor pagination

```bash
csdk db-pool-config list --limit 10 --after <cursor>
```

### Find first matching dbPoolConfig

```bash
csdk db-pool-config find-first --where.id.equalTo <value>
```

### List dbPoolConfig records with field selection

```bash
csdk db-pool-config list --select id,id
```

### List dbPoolConfig records with filtering and ordering

```bash
csdk db-pool-config list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dbPoolConfig

```bash
csdk db-pool-config create --domain <String> --poolOwnerId <UUID> --presetSlug <String> [--enabled <Boolean>] [--max <Int>] [--min <Int>] [--warmTtl <Interval>]
```

### Get a dbPoolConfig by id

```bash
csdk db-pool-config get --id <value>
```
