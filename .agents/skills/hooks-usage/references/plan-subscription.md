# planSubscription

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Assigns a plan to an entity with subscription lifecycle (start, end, active state)

## Usage

```typescript
usePlanSubscriptionsQuery({ selection: { fields: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } } })
usePlanSubscriptionQuery({ id: '<UUID>', selection: { fields: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } } })
useCreatePlanSubscriptionMutation({ selection: { fields: { id: true } } })
useUpdatePlanSubscriptionMutation({ selection: { fields: { id: true } } })
useDeletePlanSubscriptionMutation({})
```

## Examples

### List all planSubscriptions

```typescript
const { data, isLoading } = usePlanSubscriptionsQuery({
  selection: { fields: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } },
});
```

### Create a planSubscription

```typescript
const { mutate } = useCreatePlanSubscriptionMutation({
  selection: { fields: { id: true } },
});
mutate({ endsAt: '<Datetime>', entityId: '<UUID>', entityType: '<String>', isActive: '<Boolean>', organizationId: '<UUID>', planId: '<UUID>', startsAt: '<Datetime>' });
```
