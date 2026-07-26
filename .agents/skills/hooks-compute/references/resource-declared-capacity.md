# resourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for ResourceDeclaredCapacity data operations

## Usage

```typescript
useResourceDeclaredCapacitiesQuery({ selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } } })
useCreateResourceDeclaredCapacityMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all resourceDeclaredCapacities

```typescript
const { data, isLoading } = useResourceDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});
```

### Create a resourceDeclaredCapacity

```typescript
const { mutate } = useCreateResourceDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```
