# platformApi

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

API surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
usePlatformApisQuery({ selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
usePlatformApiQuery({ id: '<UUID>', selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } } })
useCreatePlatformApiMutation({ selection: { fields: { id: true } } })
useUpdatePlatformApiMutation({ selection: { fields: { id: true } } })
useDeletePlatformApiMutation({})
```

## Examples

### List all platformApis

```typescript
const { data, isLoading } = usePlatformApisQuery({
  selection: { fields: { anonRole: true, config: true, createdAt: true, dbname: true, id: true, isPublished: true, name: true, roleName: true, updatedAt: true } },
});
```

### Create a platformApi

```typescript
const { mutate } = useCreatePlatformApiMutation({
  selection: { fields: { id: true } },
});
mutate({ anonRole: '<String>', config: '<JSON>', dbname: '<String>', isPublished: '<Boolean>', name: '<String>', roleName: '<String>' });
```
