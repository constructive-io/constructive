# infraGetAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InfraGetAllRecord data operations

## Usage

```typescript
useInfraGetAllQuery({ selection: { fields: { path: true, data: true } } })
useCreateInfraGetAllRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all infraGetAll

```typescript
const { data, isLoading } = useInfraGetAllQuery({
  selection: { fields: { path: true, data: true } },
});
```

### Create a infraGetAllRecord

```typescript
const { mutate } = useCreateInfraGetAllRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ path: '<String>', data: '<JSON>' });
```
