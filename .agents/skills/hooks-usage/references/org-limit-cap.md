# orgLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default.

## Usage

```typescript
useOrgLimitCapsQuery({ selection: { fields: { id: true, name: true, entityId: true, max: true } } })
useOrgLimitCapQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, entityId: true, max: true } } })
useCreateOrgLimitCapMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitCapMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitCapMutation({})
```

## Examples

### List all orgLimitCaps

```typescript
const { data, isLoading } = useOrgLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});
```

### Create a orgLimitCap

```typescript
const { mutate } = useCreateOrgLimitCapMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```
