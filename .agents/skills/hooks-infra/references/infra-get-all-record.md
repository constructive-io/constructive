# infraGetAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InfraGetAllRecord data operations

## Usage

```typescript
useInfraGetAllQuery({ selection: { fields: { data: true, path: true } } })
useCreateInfraGetAllRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all infraGetAll

```typescript
const { data, isLoading } = useInfraGetAllQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a infraGetAllRecord

```typescript
const { mutate } = useCreateInfraGetAllRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
