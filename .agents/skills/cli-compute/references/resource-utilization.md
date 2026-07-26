# resourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceUtilization records via csdk CLI

## Usage

```bash
csdk resource-utilization list
csdk resource-utilization list --where.<field>.<op> <value> --orderBy <values>
csdk resource-utilization list --limit 10 --after <cursor>
csdk resource-utilization find-first --where.<field>.<op> <value>
csdk resource-utilization get --id <UUID>
csdk resource-utilization create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
csdk resource-utilization update --id <UUID> [--avgMemoryBytes <BigInt>] [--cpuLimitMillicores <BigInt>] [--cpuPeakUtilization <BigFloat>] [--cpuRequestHeadroomMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--date <Date>] [--gbSeconds <BigFloat>] [--kind <String>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--memoryLimitBytes <BigInt>] [--memoryPeakUtilization <BigFloat>] [--memoryRequestBytes <BigInt>] [--memoryRequestHeadroomBytes <BigInt>] [--namespaceId <UUID>] [--replicas <Int>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk resource-utilization delete --id <UUID>
```

## Examples

### List resourceUtilization records

```bash
csdk resource-utilization list
```

### List resourceUtilization records with pagination

```bash
csdk resource-utilization list --limit 10 --offset 0
```

### List resourceUtilization records with cursor pagination

```bash
csdk resource-utilization list --limit 10 --after <cursor>
```

### Find first matching resourceUtilization

```bash
csdk resource-utilization find-first --where.id.equalTo <value>
```

### List resourceUtilization records with field selection

```bash
csdk resource-utilization list --select id,id
```

### List resourceUtilization records with filtering and ordering

```bash
csdk resource-utilization list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceUtilization

```bash
csdk resource-utilization create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
```

### Get a resourceUtilization by id

```bash
csdk resource-utilization get --id <value>
```
