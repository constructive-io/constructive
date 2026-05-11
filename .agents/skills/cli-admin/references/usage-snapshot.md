# usageSnapshot

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UsageSnapshot records via csdk CLI

## Usage

```bash
csdk usage-snapshot list
csdk usage-snapshot list --where.<field>.<op> <value> --orderBy <values>
csdk usage-snapshot list --limit 10 --after <cursor>
csdk usage-snapshot find-first --where.<field>.<op> <value>
csdk usage-snapshot get --id <UUID>
csdk usage-snapshot create --databaseId <UUID> --metricName <String> [--metricValue <BigInt>] [--dimensions <JSON>] [--capturedAt <Datetime>]
csdk usage-snapshot update --id <UUID> [--databaseId <UUID>] [--metricName <String>] [--metricValue <BigInt>] [--dimensions <JSON>] [--capturedAt <Datetime>]
csdk usage-snapshot delete --id <UUID>
```

## Examples

### List usageSnapshot records

```bash
csdk usage-snapshot list
```

### List usageSnapshot records with pagination

```bash
csdk usage-snapshot list --limit 10 --offset 0
```

### List usageSnapshot records with cursor pagination

```bash
csdk usage-snapshot list --limit 10 --after <cursor>
```

### Find first matching usageSnapshot

```bash
csdk usage-snapshot find-first --where.id.equalTo <value>
```

### List usageSnapshot records with field selection

```bash
csdk usage-snapshot list --select id,id
```

### List usageSnapshot records with filtering and ordering

```bash
csdk usage-snapshot list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a usageSnapshot

```bash
csdk usage-snapshot create --databaseId <UUID> --metricName <String> [--metricValue <BigInt>] [--dimensions <JSON>] [--capturedAt <Datetime>]
```

### Get a usageSnapshot by id

```bash
csdk usage-snapshot get --id <value>
```
