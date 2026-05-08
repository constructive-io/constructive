# appLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default.

## Usage

```typescript
useAppLimitCapsQuery({ selection: { fields: { id: true, name: true, entityId: true, max: true } } })
useAppLimitCapQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, entityId: true, max: true } } })
useCreateAppLimitCapMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCapMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCapMutation({})
```

## Examples

### List all appLimitCaps

```typescript
const { data, isLoading } = useAppLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});
```

### Create a appLimitCap

```typescript
const { mutate } = useCreateAppLimitCapMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```
