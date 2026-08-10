# billingUsageSummary

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Permanent monthly usage summary per entity per meter (user-facing billing dashboard)

## Usage

```typescript
useBillingUsageSummariesQuery({ selection: { fields: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } } })
useBillingUsageSummaryQuery({ id: '<UUID>', selection: { fields: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } } })
useCreateBillingUsageSummaryMutation({ selection: { fields: { id: true } } })
useUpdateBillingUsageSummaryMutation({ selection: { fields: { id: true } } })
useDeleteBillingUsageSummaryMutation({})
```

## Examples

### List all billingUsageSummaries

```typescript
const { data, isLoading } = useBillingUsageSummariesQuery({
  selection: { fields: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } },
});
```

### Create a billingUsageSummary

```typescript
const { mutate } = useCreateBillingUsageSummaryMutation({
  selection: { fields: { id: true } },
});
mutate({ creditsConsumed: '<BigInt>', entityId: '<UUID>', entityType: '<String>', meterSlug: '<String>', organizationId: '<UUID>', overageUnits: '<BigInt>', periodEnd: '<Datetime>', periodStart: '<Datetime>', planLimit: '<BigInt>', quantityUsed: '<BigInt>' });
```
