# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
db.principal.findMany({ select: { id: true } }).execute()
db.principal.findOne({ principalId: '<UUID>', select: { id: true } }).execute()
db.principal.create({ data: { bypassStepUp: '<Boolean>', id: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', ownerId: '<UUID>', useAdminOwner: '<Boolean>', userId: '<UUID>' }, select: { id: true } }).execute()
db.principal.update({ where: { principalId: '<UUID>' }, data: { bypassStepUp: '<Boolean>' }, select: { id: true } }).execute()
db.principal.delete({ where: { principalId: '<UUID>' } }).execute()
```

## Examples

### List all principal records

```typescript
const items = await db.principal.findMany({
  select: { principalId: true, bypassStepUp: true }
}).execute();
```

### Create a principal

```typescript
const item = await db.principal.create({
  data: { bypassStepUp: '<Boolean>', id: '<UUID>', isReadOnly: '<Boolean>', name: '<String>', ownerId: '<UUID>', useAdminOwner: '<Boolean>', userId: '<UUID>' },
  select: { principalId: true }
}).execute();
```
