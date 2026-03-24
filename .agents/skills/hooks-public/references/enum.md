# enum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Enum data operations

## Usage

```typescript
useEnumsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useEnumQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useCreateEnumMutation({ selection: { fields: { id: true } } })
useUpdateEnumMutation({ selection: { fields: { id: true } } })
useDeleteEnumMutation({})
```

## Examples

### List all enums

```typescript
const { data, isLoading } = useEnumsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, label: true, description: true, values: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});
```

### Create a enum

```typescript
const { mutate } = useCreateEnumMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', label: '<String>', description: '<String>', values: '<String>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
