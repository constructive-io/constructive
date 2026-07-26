# platformResourceUtilization

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceUtilization records via csdk CLI

## Usage

```bash
csdk platform-resource-utilization list
csdk platform-resource-utilization list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-utilization list --limit 10 --after <cursor>
csdk platform-resource-utilization find-first --where.<field>.<op> <value>
csdk platform-resource-utilization get --id <UUID>
csdk platform-resource-utilization create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
csdk platform-resource-utilization update --id <UUID> [--avgMemoryBytes <BigInt>] [--cpuLimitMillicores <BigInt>] [--cpuPeakUtilization <BigFloat>] [--cpuRequestHeadroomMillicores <BigInt>] [--cpuRequestMillicores <BigInt>] [--date <Date>] [--gbSeconds <BigFloat>] [--kind <String>] [--maxCpuMillicores <BigInt>] [--maxMemoryBytes <BigInt>] [--memoryLimitBytes <BigInt>] [--memoryPeakUtilization <BigFloat>] [--memoryRequestBytes <BigInt>] [--memoryRequestHeadroomBytes <BigInt>] [--namespaceId <UUID>] [--replicas <Int>] [--resourceId <UUID>] [--runtimeSeconds <BigInt>] [--sampleCount <Int>]
csdk platform-resource-utilization delete --id <UUID>
```

## Examples

### List platformResourceUtilization records

```bash
csdk platform-resource-utilization list
```

### List platformResourceUtilization records with pagination

```bash
csdk platform-resource-utilization list --limit 10 --offset 0
```

### List platformResourceUtilization records with cursor pagination

```bash
csdk platform-resource-utilization list --limit 10 --after <cursor>
```

### Find first matching platformResourceUtilization

```bash
csdk platform-resource-utilization find-first --where.id.equalTo <value>
```

### List platformResourceUtilization records with field selection

```bash
csdk platform-resource-utilization list --select id,id
```

### List platformResourceUtilization records with filtering and ordering

```bash
csdk platform-resource-utilization list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceUtilization

```bash
csdk platform-resource-utilization create --avgMemoryBytes <BigInt> --cpuLimitMillicores <BigInt> --cpuPeakUtilization <BigFloat> --cpuRequestHeadroomMillicores <BigInt> --cpuRequestMillicores <BigInt> --date <Date> --gbSeconds <BigFloat> --kind <String> --maxCpuMillicores <BigInt> --maxMemoryBytes <BigInt> --memoryLimitBytes <BigInt> --memoryPeakUtilization <BigFloat> --memoryRequestBytes <BigInt> --memoryRequestHeadroomBytes <BigInt> --namespaceId <UUID> --replicas <Int> --resourceId <UUID> --runtimeSeconds <BigInt> --sampleCount <Int>
```

### Get a platformResourceUtilization by id

```bash
csdk platform-resource-utilization get --id <value>
```
