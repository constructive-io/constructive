# platformInfraGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for PlatformInfraGetAllTreeNodesRecord data operations

## Usage

```typescript
usePlatformInfraGetAllTreeNodesQuery({ selection: { fields: { data: true, path: true } } })
useCreatePlatformInfraGetAllTreeNodesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all platformInfraGetAllTreeNodes

```typescript
const { data, isLoading } = usePlatformInfraGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a platformInfraGetAllTreeNodesRecord

```typescript
const { mutate } = useCreatePlatformInfraGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
