# appLimitCreditCodeItem

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Items within a credit code — each row grants credits for a specific limit definition

## Usage

```typescript
useAppLimitCreditCodeItemsQuery({ selection: { fields: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } } })
useAppLimitCreditCodeItemQuery({ id: '<UUID>', selection: { fields: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } } })
useCreateAppLimitCreditCodeItemMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditCodeItemMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditCodeItemMutation({})
```

## Examples

### List all appLimitCreditCodeItems

```typescript
const { data, isLoading } = useAppLimitCreditCodeItemsQuery({
  selection: { fields: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } },
});
```

### Create a appLimitCreditCodeItem

```typescript
const { mutate } = useCreateAppLimitCreditCodeItemMutation({
  selection: { fields: { id: true } },
});
mutate({ amount: '<BigInt>', creditCodeId: '<UUID>', creditType: '<String>', defaultLimitId: '<UUID>' });
```
