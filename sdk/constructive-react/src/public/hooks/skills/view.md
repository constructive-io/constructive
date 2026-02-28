# hooks-view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for View data operations

## Usage

```typescript
useViewsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useViewQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useCreateViewMutation({ selection: { fields: { id: true } } })
useUpdateViewMutation({ selection: { fields: { id: true } } })
useDeleteViewMutation({})
```

## Examples

### List all views

```typescript
const { data, isLoading } = useViewsQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } },
});
```

### Create a view

```typescript
const { mutate } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', name: '<value>', tableId: '<value>', viewType: '<value>', data: '<value>', filterType: '<value>', filterData: '<value>', securityInvoker: '<value>', isReadOnly: '<value>', smartTags: '<value>', category: '<value>', module: '<value>', scope: '<value>', tags: '<value>' });
```
