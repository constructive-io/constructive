# orgLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants that automatically update limit ceilings

## Usage

```typescript
useOrgLimitCreditsQuery({ selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } } })
useOrgLimitCreditQuery({ id: '<UUID>', selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } } })
useCreateOrgLimitCreditMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitCreditMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitCreditMutation({})
```

## Examples

### List all orgLimitCredits

```typescript
const { data, isLoading } = useOrgLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } },
});
```

### Create a orgLimitCredit

```typescript
const { mutate } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
mutate({ defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```
