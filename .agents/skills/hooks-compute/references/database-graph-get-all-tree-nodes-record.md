# databaseGraphGetAllTreeNodesRecord

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DatabaseGraphGetAllTreeNodesRecord data operations

## Usage

```typescript
useDatabaseGraphGetAllTreeNodesQuery({ selection: { fields: { data: true, path: true } } })
useCreateDatabaseGraphGetAllTreeNodesRecordMutation({ selection: { fields: { id: true } } })
```

## Examples

### List all databaseGraphGetAllTreeNodes

```typescript
const { data, isLoading } = useDatabaseGraphGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});
```

### Create a databaseGraphGetAllTreeNodesRecord

```typescript
const { mutate } = useCreateDatabaseGraphGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
mutate({ data: '<JSON>', path: '<String>' });
```
