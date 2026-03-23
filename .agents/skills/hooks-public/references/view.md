# view

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for View data operations

## Usage

```typescript
useViewsQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
useViewQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, name: true, tableId: true, viewType: true, data: true, filterType: true, filterData: true, securityInvoker: true, isReadOnly: true, smartTags: true, category: true, module: true, scope: true, tags: true } } })
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
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', name: '<String>', tableId: '<UUID>', viewType: '<String>', data: '<JSON>', filterType: '<String>', filterData: '<JSON>', securityInvoker: '<Boolean>', isReadOnly: '<Boolean>', smartTags: '<JSON>', category: '<ObjectCategory>', module: '<String>', scope: '<Int>', tags: '<String>' });
```
