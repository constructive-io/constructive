# platformDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformDeclaredCapacity data operations

## Usage

```typescript
usePlatformDeclaredCapacitiesQuery({ selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } } })
useCreatePlatformDeclaredCapacityMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformDeclaredCapacities

```typescript
const { data, isLoading } = usePlatformDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});
```

### Create a platformDeclaredCapacity

```typescript
const { mutate } = useCreatePlatformDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```
