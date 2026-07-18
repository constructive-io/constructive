# platformResourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceUsageSummary records via csdk CLI

## Usage

```bash
csdk platform-resource-usage-summary list
csdk platform-resource-usage-summary list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-usage-summary list --limit 10 --after <cursor>
csdk platform-resource-usage-summary find-first --where.<field>.<op> <value>
csdk platform-resource-usage-summary get --id <UUID>
csdk platform-resource-usage-summary create --date <Date> --namespaceId <UUID> [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk platform-resource-usage-summary update --id <UUID> [--date <Date>] [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--namespaceId <UUID>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk platform-resource-usage-summary delete --id <UUID>
```

## Examples

### List platformResourceUsageSummary records

```bash
csdk platform-resource-usage-summary list
```

### List platformResourceUsageSummary records with pagination

```bash
csdk platform-resource-usage-summary list --limit 10 --offset 0
```

### List platformResourceUsageSummary records with cursor pagination

```bash
csdk platform-resource-usage-summary list --limit 10 --after <cursor>
```

### Find first matching platformResourceUsageSummary

```bash
csdk platform-resource-usage-summary find-first --where.id.equalTo <value>
```

### List platformResourceUsageSummary records with field selection

```bash
csdk platform-resource-usage-summary list --select id,id
```

### List platformResourceUsageSummary records with filtering and ordering

```bash
csdk platform-resource-usage-summary list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceUsageSummary

```bash
csdk platform-resource-usage-summary create --date <Date> --namespaceId <UUID> [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
```

### Get a platformResourceUsageSummary by id

```bash
csdk platform-resource-usage-summary get --id <value>
```
