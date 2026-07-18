# platformResourceUtilizationDaily

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceUtilizationDaily records via csdk CLI

## Usage

```bash
csdk platform-resource-utilization-daily list
csdk platform-resource-utilization-daily list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-utilization-daily list --limit 10 --after <cursor>
csdk platform-resource-utilization-daily find-first --where.<field>.<op> <value>
csdk platform-resource-utilization-daily get --id <UUID>
csdk platform-resource-utilization-daily create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
csdk platform-resource-utilization-daily update --id <UUID> [--avgMemoryBytes <BigInt>] [--cpuLimitMillicores <BigInt>] [--cpuPeakUtilization <BigFloat>] [--cpuRequestHeadroomMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--date <Date>] [--gbSeconds <BigFloat>] [--kind <String>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--memoryLimitBytes <BigInt>] [--memoryPeakUtilization <BigFloat>] [--memoryRequestBytes <BigInt>] [--memoryRequestHeadroomBytes <BigInt>] [--namespaceId <UUID>] [--replicas <Int>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk platform-resource-utilization-daily delete --id <UUID>
```

## Examples

### List platformResourceUtilizationDaily records

```bash
csdk platform-resource-utilization-daily list
```

### List platformResourceUtilizationDaily records with pagination

```bash
csdk platform-resource-utilization-daily list --limit 10 --offset 0
```

### List platformResourceUtilizationDaily records with cursor pagination

```bash
csdk platform-resource-utilization-daily list --limit 10 --after <cursor>
```

### Find first matching platformResourceUtilizationDaily

```bash
csdk platform-resource-utilization-daily find-first --where.id.equalTo <value>
```

### List platformResourceUtilizationDaily records with field selection

```bash
csdk platform-resource-utilization-daily list --select id,id
```

### List platformResourceUtilizationDaily records with filtering and ordering

```bash
csdk platform-resource-utilization-daily list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceUtilizationDaily

```bash
csdk platform-resource-utilization-daily create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
```

### Get a platformResourceUtilizationDaily by id

```bash
csdk platform-resource-utilization-daily get --id <value>
```
