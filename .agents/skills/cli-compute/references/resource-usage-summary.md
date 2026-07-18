# resourceUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceUsageSummary records via csdk CLI

## Usage

```bash
csdk resource-usage-summary list
csdk resource-usage-summary list --where.<field>.<op> <value> --orderBy <values>
csdk resource-usage-summary list --limit 10 --after <cursor>
csdk resource-usage-summary find-first --where.<field>.<op> <value>
csdk resource-usage-summary get --id <UUID>
csdk resource-usage-summary create --databaseId <UUID> --date <Date> --namespaceId <UUID> [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk resource-usage-summary update --id <UUID> [--databaseId <UUID>] [--date <Date>] [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--namespaceId <UUID>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk resource-usage-summary delete --id <UUID>
```

## Examples

### List resourceUsageSummary records

```bash
csdk resource-usage-summary list
```

### List resourceUsageSummary records with pagination

```bash
csdk resource-usage-summary list --limit 10 --offset 0
```

### List resourceUsageSummary records with cursor pagination

```bash
csdk resource-usage-summary list --limit 10 --after <cursor>
```

### Find first matching resourceUsageSummary

```bash
csdk resource-usage-summary find-first --where.id.equalTo <value>
```

### List resourceUsageSummary records with field selection

```bash
csdk resource-usage-summary list --select id,id
```

### List resourceUsageSummary records with filtering and ordering

```bash
csdk resource-usage-summary list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceUsageSummary

```bash
csdk resource-usage-summary create --databaseId <UUID> --date <Date> --namespaceId <UUID> [--gbSeconds <BigFloat>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
```

### Get a resourceUsageSummary by id

```bash
csdk resource-usage-summary get --id <value>
```
