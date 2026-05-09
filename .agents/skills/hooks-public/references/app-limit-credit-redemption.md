# appLimitCreditRedemption

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits

## Usage

```typescript
useAppLimitCreditRedemptionsQuery({ selection: { fields: { id: true, creditCodeId: true, entityId: true } } })
useAppLimitCreditRedemptionQuery({ id: '<UUID>', selection: { fields: { id: true, creditCodeId: true, entityId: true } } })
useCreateAppLimitCreditRedemptionMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditRedemptionMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditRedemptionMutation({})
```

## Examples

### List all appLimitCreditRedemptions

```typescript
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { id: true, creditCodeId: true, entityId: true } },
});
```

### Create a appLimitCreditRedemption

```typescript
const { mutate } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
mutate({ creditCodeId: '<UUID>', entityId: '<UUID>' });
```
