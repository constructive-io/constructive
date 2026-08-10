# ledger

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Append-only event log for all billing events (usage, grants, adjustments)

## Usage

```typescript
useLedgersQuery({ selection: { fields: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } } })
useLedgerQuery({ id: '<UUID>', selection: { fields: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } } })
useCreateLedgerMutation({ selection: { fields: { id: true } } })
useUpdateLedgerMutation({ selection: { fields: { id: true } } })
useDeleteLedgerMutation({})
```

## Examples

### List all ledgers

```typescript
const { data, isLoading } = useLedgersQuery({
  selection: { fields: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } },
});
```

### Create a ledger

```typescript
const { mutate } = useCreateLedgerMutation({
  selection: { fields: { id: true } },
});
mutate({ delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', entryType: '<String>', ledgerClass: '<String>', metadata: '<JSON>', meterSlug: '<String>', organizationId: '<UUID>', usageAfter: '<BigInt>' });
```
