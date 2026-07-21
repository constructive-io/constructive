# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
useAppLimitsQuery({ selection: { fields: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } } })
useAppLimitQuery({ id: '<UUID>', selection: { fields: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } } })
useCreateAppLimitMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitMutation({})
```

## Examples

### List all appLimits

```typescript
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});
```

### Create a appLimit

```typescript
const { mutate } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```
