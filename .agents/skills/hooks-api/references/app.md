# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App aggregates: thin identity rows whose components are global catalog references

## Usage

```typescript
useAppsQuery({ selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, status: true, title: true, updatedAt: true } } })
useAppQuery({ id: '<UUID>', selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, status: true, title: true, updatedAt: true } } })
useCreateAppMutation({ selection: { fields: { id: true } } })
useUpdateAppMutation({ selection: { fields: { id: true } } })
useDeleteAppMutation({})
```

## Examples

### List all apps

```typescript
const { data, isLoading } = useAppsQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, description: true, id: true, isPublished: true, name: true, status: true, title: true, updatedAt: true } },
});
```

### Create a app

```typescript
const { mutate } = useCreateAppMutation({
  selection: { fields: { id: true } },
});
mutate({ config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', status: '<String>', title: '<String>' });
```
