# declaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DeclaredCapacity data operations

## Usage

```typescript
useDeclaredCapacitiesQuery({ selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } } })
useCreateDeclaredCapacityMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all declaredCapacities

```typescript
const { data, isLoading } = useDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});
```

### Create a declaredCapacity

```typescript
const { mutate } = useCreateDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
mutate({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```
