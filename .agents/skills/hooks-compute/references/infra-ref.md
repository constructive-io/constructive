# infraRef

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branch heads — mutable pointers into the commit chain

## Usage

```typescript
useInfraRefsQuery({ selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useInfraRefQuery({ id: '<UUID>', selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } } })
useCreateInfraRefMutation({ selection: { fields: { id: true } } })
useUpdateInfraRefMutation({ selection: { fields: { id: true } } })
useDeleteInfraRefMutation({})
```

## Examples

### List all infraRefs

```typescript
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});
```

### Create a infraRef

```typescript
const { mutate } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
mutate({ commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' });
```
