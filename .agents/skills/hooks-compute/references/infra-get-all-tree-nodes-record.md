# infraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InfraGetAllTreeNodesRecord data operations

## Usage

```typescript
useInfraGetAllTreeNodesQuery({ selection: { fields: { data: true, path: true } } })
useCreateInfraGetAllTreeNodesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all infraGetAllTreeNodes

```typescript
const { data, isLoading } = useInfraGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a infraGetAllTreeNodesRecord

```typescript
const { mutate } = useCreateInfraGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
