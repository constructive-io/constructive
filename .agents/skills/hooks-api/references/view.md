# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for View data operations

## Usage

```typescript
useViewsQuery({ selection: { fields: { category: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } } })
useViewQuery({ id: '<UUID>', selection: { fields: { category: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } } })
useCreateViewMutation({ selection: { fields: { id: true } } })
useUpdateViewMutation({ selection: { fields: { id: true } } })
useDeleteViewMutation({})
```

## Examples

### List all views

```typescript
const { data, isLoading } = useViewsQuery({
  selection: { fields: { category: true, data: true, databaseId: true, filterData: true, filterType: true, id: true, isReadOnly: true, name: true, schemaId: true, securityInvoker: true, smartTags: true, tableId: true, tags: true, viewType: true } },
});
```

### Create a view

```typescript
const { mutate } = useCreateViewMutation({
  selection: { fields: { id: true } },
});
mutate({ category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', filterData: '<JSON>', filterType: '<String>', isReadOnly: '<Boolean>', name: '<String>', schemaId: '<UUID>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tableId: '<UUID>', tags: '<String>', viewType: '<String>' });
```
