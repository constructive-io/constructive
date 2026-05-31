# appLimitCreditCodeItem

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Items within a credit code — each row grants credits for a specific limit definition

## Usage

```typescript
useAppLimitCreditCodeItemsQuery({ selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } } })
useAppLimitCreditCodeItemQuery({ id: '<UUID>', selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } } })
useCreateAppLimitCreditCodeItemMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditCodeItemMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditCodeItemMutation({})
```

## Examples

### List all appLimitCreditCodeItems

```typescript
const { data, isLoading } = useAppLimitCreditCodeItemsQuery({
  selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } },
});
```

### Create a appLimitCreditCodeItem

```typescript
const { mutate } = useCreateAppLimitCreditCodeItemMutation({
  selection: { fields: { id: true } },
});
mutate({ creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' });
```
