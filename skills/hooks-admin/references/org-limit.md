# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
useOrgLimitsQuery({ selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } } })
useOrgLimitQuery({ id: '<value>', selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } } })
useCreateOrgLimitMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitMutation({})
```

## Examples

### List all orgLimits

```typescript
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, entityId: true } },
});
```

### Create a orgLimit

```typescript
const { mutate } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<value>', actorId: '<value>', num: '<value>', max: '<value>', entityId: '<value>' });
```
