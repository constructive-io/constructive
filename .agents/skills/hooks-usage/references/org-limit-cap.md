# orgLimitCap

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default.

## Usage

```typescript
useOrgLimitCapsQuery({ selection: { fields: { entityId: true, id: true, max: true, name: true } } })
useOrgLimitCapQuery({ id: '<UUID>', selection: { fields: { entityId: true, id: true, max: true, name: true } } })
useCreateOrgLimitCapMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitCapMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitCapMutation({})
```

## Examples

### List all orgLimitCaps

```typescript
const { data, isLoading } = useOrgLimitCapsQuery({
  selection: { fields: { entityId: true, id: true, max: true, name: true } },
});
```

### Create a orgLimitCap

```typescript
const { mutate } = useCreateOrgLimitCapMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', max: '<BigInt>', name: '<String>' });
```
