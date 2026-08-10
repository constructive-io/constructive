# planPricing

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Billing intervals and pricing for each plan tier

## Usage

```typescript
usePlanPricingsQuery({ selection: { fields: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } } })
usePlanPricingQuery({ id: '<UUID>', selection: { fields: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } } })
useCreatePlanPricingMutation({ selection: { fields: { id: true } } })
useUpdatePlanPricingMutation({ selection: { fields: { id: true } } })
useDeletePlanPricingMutation({})
```

## Examples

### List all planPricings

```typescript
const { data, isLoading } = usePlanPricingsQuery({
  selection: { fields: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } },
});
```

### Create a planPricing

```typescript
const { mutate } = useCreatePlanPricingMutation({
  selection: { fields: { id: true } },
});
mutate({ billingInterval: '<String>', currency: '<String>', discountPercent: '<BigFloat>', isActive: '<Boolean>', planId: '<UUID>', price: '<BigInt>' });
```
