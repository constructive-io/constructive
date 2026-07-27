# platformResourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformResourceDeclaredCapacity data operations

## Usage

```typescript
usePlatformResourceDeclaredCapacitiesQuery({ selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } } })
useCreatePlatformResourceDeclaredCapacityMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformResourceDeclaredCapacities

```typescript
const { data, isLoading } = usePlatformResourceDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});
```

### Create a platformResourceDeclaredCapacity

```typescript
const { mutate } = useCreatePlatformResourceDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```
