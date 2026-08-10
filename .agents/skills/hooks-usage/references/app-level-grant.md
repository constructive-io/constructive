# appLevelGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records when a user achieves a level; prevents duplicate reward grants

## Usage

```typescript
useAppLevelGrantsQuery({ selection: { fields: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } } })
useAppLevelGrantQuery({ id: '<UUID>', selection: { fields: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } } })
useCreateAppLevelGrantMutation({ selection: { fields: { id: true } } })
useUpdateAppLevelGrantMutation({ selection: { fields: { id: true } } })
useDeleteAppLevelGrantMutation({})
```

## Examples

### List all appLevelGrants

```typescript
const { data, isLoading } = useAppLevelGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } },
});
```

### Create a appLevelGrant

```typescript
const { mutate } = useCreateAppLevelGrantMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', expiresAt: '<Datetime>', levelName: '<String>', periodStart: '<Datetime>' });
```
