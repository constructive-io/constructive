# getAllRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GetAllRecord data operations

## Usage

```typescript
useGetAllQuery({ selection: { fields: { data: true, path: true } } })
useCreateGetAllRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all getAll

```typescript
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a getAllRecord

```typescript
const { mutate } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
