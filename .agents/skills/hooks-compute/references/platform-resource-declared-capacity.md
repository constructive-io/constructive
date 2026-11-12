# platformResourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourceDeclaredCapacity data operations

## Usage

```typescript
usePlatformResourceDeclaredCapacitiesQuery({ selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true, storageTotalBytes: true } } })
```

## Examples

### List all platformResourceDeclaredCapacities

```typescript
const { data, isLoading } = usePlatformResourceDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true, storageTotalBytes: true } },
});
```
