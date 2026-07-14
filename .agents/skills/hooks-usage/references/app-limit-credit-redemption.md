# appLimitCreditRedemption

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits

## Usage

```typescript
useAppLimitCreditRedemptionsQuery({ selection: { fields: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } } })
useAppLimitCreditRedemptionQuery({ id: '<UUID>', selection: { fields: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } } })
useCreateAppLimitCreditRedemptionMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditRedemptionMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditRedemptionMutation({})
```

## Examples

### List all appLimitCreditRedemptions

```typescript
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } },
});
```

### Create a appLimitCreditRedemption

```typescript
const { mutate } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
mutate({ creditCodeId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>' });
```
