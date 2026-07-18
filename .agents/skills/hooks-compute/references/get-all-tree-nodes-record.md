# getAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for GetAllTreeNodesRecord data operations

## Usage

```typescript
useGetAllTreeNodesQuery({ selection: { fields: { data: true, path: true } } })
useCreateGetAllTreeNodesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all getAllTreeNodes

```typescript
const { data, isLoading } = useGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a getAllTreeNodesRecord

```typescript
const { mutate } = useCreateGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
