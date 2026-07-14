# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
useOrgLimitsQuery({ selection: { fields: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } } })
useOrgLimitQuery({ id: '<UUID>', selection: { fields: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } } })
useCreateOrgLimitMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitMutation({})
```

## Examples

### List all orgLimits

```typescript
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});
```

### Create a orgLimit

```typescript
const { mutate } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```
