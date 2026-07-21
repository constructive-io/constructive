# orgLimitAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown)

## Usage

```typescript
useOrgLimitAggregatesQuery({ selection: { fields: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } } })
useOrgLimitAggregateQuery({ id: '<UUID>', selection: { fields: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } } })
useCreateOrgLimitAggregateMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitAggregateMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitAggregateMutation({})
```

## Examples

### List all orgLimitAggregates

```typescript
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } },
});
```

### Create a orgLimitAggregate

```typescript
const { mutate } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
mutate({ entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', reserved: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```
