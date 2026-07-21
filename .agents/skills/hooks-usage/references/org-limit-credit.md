# orgLimitCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants that automatically update limit ceilings

## Usage

```typescript
useOrgLimitCreditsQuery({ selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } } })
useOrgLimitCreditQuery({ id: '<UUID>', selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } } })
useCreateOrgLimitCreditMutation({ selection: { fields: { id: true } } })
useUpdateOrgLimitCreditMutation({ selection: { fields: { id: true } } })
useDeleteOrgLimitCreditMutation({})
```

## Examples

### List all orgLimitCredits

```typescript
const { data, isLoading } = useOrgLimitCreditsQuery({
  selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } },
});
```

### Create a orgLimitCredit

```typescript
const { mutate } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>', reason: '<String>' });
```
