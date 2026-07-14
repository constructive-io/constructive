# appLimitCreditCode

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Redeemable credit codes managed by admins with the add_credits permission

## Usage

```typescript
useAppLimitCreditCodesQuery({ selection: { fields: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } } })
useAppLimitCreditCodeQuery({ id: '<UUID>', selection: { fields: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } } })
useCreateAppLimitCreditCodeMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditCodeMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditCodeMutation({})
```

## Examples

### List all appLimitCreditCodes

```typescript
const { data, isLoading } = useAppLimitCreditCodesQuery({
  selection: { fields: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } },
});
```

### Create a appLimitCreditCode

```typescript
const { mutate } = useCreateAppLimitCreditCodeMutation({
  selection: { fields: { id: true } },
});
mutate({ code: '<String>', currentRedemptions: '<Int>', expiresAt: '<Datetime>', maxRedemptions: '<Int>' });
```
