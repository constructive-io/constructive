# meterCredit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only ledger of credit grants for billing meters that automatically update balances

## Usage

```typescript
useMeterCreditsQuery({ selection: { fields: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } } })
useMeterCreditQuery({ id: '<UUID>', selection: { fields: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } } })
useCreateMeterCreditMutation({ selection: { fields: { id: true } } })
useUpdateMeterCreditMutation({ selection: { fields: { id: true } } })
useDeleteMeterCreditMutation({})
```

## Examples

### List all meterCredits

```typescript
const { data, isLoading } = useMeterCreditsQuery({
  selection: { fields: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } },
});
```

### Create a meterCredit

```typescript
const { mutate } = useCreateMeterCreditMutation({
  selection: { fields: { id: true } },
});
mutate({ amount: '<BigInt>', creditType: '<String>', entityId: '<UUID>', entityType: '<String>', expiresAt: '<Datetime>', meterId: '<UUID>', organizationId: '<UUID>', reason: '<String>' });
```
