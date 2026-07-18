# platformResourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceUsageLog records via csdk CLI

## Usage

```bash
csdk platform-resource-usage-log list
csdk platform-resource-usage-log list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-usage-log list --limit 10 --after <cursor>
csdk platform-resource-usage-log find-first --where.<field>.<op> <value>
csdk platform-resource-usage-log get --id <UUID>
csdk platform-resource-usage-log create --intervalSeconds <Int> --namespaceId <UUID> --source <String> [--cpuMillicores <BigInt>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--resourceId <UUID>] [--sampledAt <Datetime>]
csdk platform-resource-usage-log update --id <UUID> [--cpuMillicores <BigInt>] [--intervalSeconds <Int>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--namespaceId <UUID>] [--resourceId <UUID>] [--sampledAt <Datetime>] [--source <String>]
csdk platform-resource-usage-log delete --id <UUID>
```

## Examples

### List platformResourceUsageLog records

```bash
csdk platform-resource-usage-log list
```

### List platformResourceUsageLog records with pagination

```bash
csdk platform-resource-usage-log list --limit 10 --offset 0
```

### List platformResourceUsageLog records with cursor pagination

```bash
csdk platform-resource-usage-log list --limit 10 --after <cursor>
```

### Find first matching platformResourceUsageLog

```bash
csdk platform-resource-usage-log find-first --where.id.equalTo <value>
```

### List platformResourceUsageLog records with field selection

```bash
csdk platform-resource-usage-log list --select id,id
```

### List platformResourceUsageLog records with filtering and ordering

```bash
csdk platform-resource-usage-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceUsageLog

```bash
csdk platform-resource-usage-log create --intervalSeconds <Int> --namespaceId <UUID> --source <String> [--cpuMillicores <BigInt>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--resourceId <UUID>] [--sampledAt <Datetime>]
```

### Get a platformResourceUsageLog by id

```bash
csdk platform-resource-usage-log get --id <value>
```
