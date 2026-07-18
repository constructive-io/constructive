# resourceUtilizationDaily

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceUtilizationDaily records via csdk CLI

## Usage

```bash
csdk resource-utilization-daily list
csdk resource-utilization-daily list --where.<field>.<op> <value> --orderBy <values>
csdk resource-utilization-daily list --limit 10 --after <cursor>
csdk resource-utilization-daily find-first --where.<field>.<op> <value>
csdk resource-utilization-daily get --id <UUID>
csdk resource-utilization-daily create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
csdk resource-utilization-daily update --id <UUID> [--avgMemoryBytes <BigInt>] [--cpuLimitMillicores <BigInt>] [--cpuPeakUtilization <BigFloat>] [--cpuRequestHeadroomMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--date <Date>] [--gbSeconds <BigFloat>] [--kind <String>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--memoryLimitBytes <BigInt>] [--memoryPeakUtilization <BigFloat>] [--memoryRequestBytes <BigInt>] [--memoryRequestHeadroomBytes <BigInt>] [--namespaceId <UUID>] [--replicas <Int>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk resource-utilization-daily delete --id <UUID>
```

## Examples

### List resourceUtilizationDaily records

```bash
csdk resource-utilization-daily list
```

### List resourceUtilizationDaily records with pagination

```bash
csdk resource-utilization-daily list --limit 10 --offset 0
```

### List resourceUtilizationDaily records with cursor pagination

```bash
csdk resource-utilization-daily list --limit 10 --after <cursor>
```

### Find first matching resourceUtilizationDaily

```bash
csdk resource-utilization-daily find-first --where.id.equalTo <value>
```

### List resourceUtilizationDaily records with field selection

```bash
csdk resource-utilization-daily list --select id,id
```

### List resourceUtilizationDaily records with filtering and ordering

```bash
csdk resource-utilization-daily list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceUtilizationDaily

```bash
csdk resource-utilization-daily create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
```

### Get a resourceUtilizationDaily by id

```bash
csdk resource-utilization-daily get --id <value>
```
