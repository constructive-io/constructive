# orgLimitAggregate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown)

## Usage

```typescript
useOrgLimitAggregatesQuery({ selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } } })
useOrgLimitAggregateQuery({ id: '<UUID>', selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } } })
useCreateOrgLimitAggregateMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitAggregateMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitAggregateMutation({})
```

## Examples

### List all orgLimitAggregates

```typescript
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } },
});
```

### Create a orgLimitAggregate

```typescript
const { mutate } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' });
```
