# platformApis

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
usePlatformApisesQuery({ selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
usePlatformApisQuery({ id: '<UUID>', selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useCreatePlatformApisMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApisMutation({ selection: { fields: { id: true } } })
useDeletePlatformApisMutation({})
```

## Examples

### List all platformApises

```typescript
const { data, isLoading } = usePlatformApisesQuery({
  selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } },
});
```

### Create a platformApis

```typescript
const { mutate } = useCreatePlatformApisMutation({
  selection: { fields: { id: true } },
});
mutate({ anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' });
```
