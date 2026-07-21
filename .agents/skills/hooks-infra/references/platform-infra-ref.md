# platformInfraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
usePlatformInfraRefsQuery({ selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } } })
usePlatformInfraRefQuery({ id: '<UUID>', selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } } })
useCreatePlatformInfraRefMutation({ selection: { fields: { id: true } } })
useUpdatePlatformInfraRefMutation({ selection: { fields: { id: true } } })
useDeletePlatformInfraRefMutation({})
```

## Examples

### List all platformInfraRefs

```typescript
const { data, isLoading } = usePlatformInfraRefsQuery({
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});
```

### Create a platformInfraRef

```typescript
const { mutate } = useCreatePlatformInfraRefMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' });
```
