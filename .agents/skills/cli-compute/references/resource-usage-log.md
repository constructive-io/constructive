# resourceUsageLog

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceUsageLog records via csdk CLI

## Usage

```bash
csdk resource-usage-log list
csdk resource-usage-log list --where.<field>.<op> <value> --orderBy <values>
csdk resource-usage-log list --limit 10 --after <cursor>
csdk resource-usage-log find-first --where.<field>.<op> <value>
csdk resource-usage-log get --id <UUID>
csdk resource-usage-log create --databaseId <UUID> --intervalSeconds <Int> --namespaceId <UUID> --source <String> [--cpuMillicores <BigInt>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--resourceId <UUID>] [--sampledAt <Datetime>]
csdk resource-usage-log update --id <UUID> [--cpuMillicores <BigInt>] [--databaseId <UUID>] [--intervalSeconds <Int>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--namespaceId <UUID>] [--resourceId <UUID>] [--sampledAt <Datetime>] [--source <String>]
csdk resource-usage-log delete --id <UUID>
```

## Examples

### List resourceUsageLog records

```bash
csdk resource-usage-log list
```

### List resourceUsageLog records with pagination

```bash
csdk resource-usage-log list --limit 10 --offset 0
```

### List resourceUsageLog records with cursor pagination

```bash
csdk resource-usage-log list --limit 10 --after <cursor>
```

### Find first matching resourceUsageLog

```bash
csdk resource-usage-log find-first --where.id.equalTo <value>
```

### List resourceUsageLog records with field selection

```bash
csdk resource-usage-log list --select id,id
```

### List resourceUsageLog records with filtering and ordering

```bash
csdk resource-usage-log list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceUsageLog

```bash
csdk resource-usage-log create --databaseId <UUID> --intervalSeconds <Int> --namespaceId <UUID> --source <String> [--cpuMillicores <BigInt>] [--memoryBytes <BigInt>] [--metrics <JSON>] [--resourceId <UUID>] [--sampledAt <Datetime>]
```

### Get a resourceUsageLog by id

```bash
csdk resource-usage-log get --id <value>
```
