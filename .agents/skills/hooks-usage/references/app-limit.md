# appLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks per-actor usage counts against configurable maximum limits

## Usage

```typescript
useAppLimitsQuery({ selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } } })
useAppLimitQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } } })
useCreateAppLimitMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitMutation({})
```

## Examples

### List all appLimits

```typescript
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } },
});
```

### Create a appLimit

```typescript
const { mutate } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' });
```
