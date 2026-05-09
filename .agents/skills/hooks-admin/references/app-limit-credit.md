# appLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants that automatically update limit ceilings

## Usage

```typescript
useAppLimitCreditsQuery({ selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } } })
useAppLimitCreditQuery({ id: '<UUID>', selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } } })
useCreateAppLimitCreditMutation({ selection: { fields: { id: true } } })
useUpdateAppLimitCreditMutation({ selection: { fields: { id: true } } })
useDeleteAppLimitCreditMutation({})
```

## Examples

### List all appLimitCredits

```typescript
const { data, isLoading } = useAppLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } },
});
```

### Create a appLimitCredit

```typescript
const { mutate } = useCreateAppLimitCreditMutation({
  selection: { fields: { id: true } },
});
mutate({ defaultLimitId: '<UUID>', actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```
