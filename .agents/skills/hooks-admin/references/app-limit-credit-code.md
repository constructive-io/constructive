# appLimitCreditCode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Redeemable credit codes managed by admins with the add_credits permission

## Usage

```typescript
useAppLimitCreditCodesQuery({ selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } } })
useAppLimitCreditCodeQuery({ id: '<UUID>', selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } } })
useCreateAppLimitCreditCodeMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditCodeMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditCodeMutation({})
```

## Examples

### List all appLimitCreditCodes

```typescript
const { data, isLoading } = useAppLimitCreditCodesQuery({
  selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } },
});
```

### Create a appLimitCreditCode

```typescript
const { mutate } = useCreateAppLimitCreditCodeMutation({
  selection: { fields: { id: true } },
});
mutate({ code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' });
```
