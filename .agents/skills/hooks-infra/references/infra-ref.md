# infraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useInfraRefsQuery({ selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } } })
useInfraRefQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } } })
useCreateInfraRefMutation({ selection: { fields: { id: true } } })
useUpdateInfraRefMutation({ selection: { fields: { id: true } } })
useDeleteInfraRefMutation({})
```

## Examples

### List all infraRefs

```typescript
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});
```

### Create a infraRef

```typescript
const { mutate } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```
