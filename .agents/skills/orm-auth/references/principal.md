# principal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scoped sub-identities (API keys and agents) with precomputed SPRT

## Usage

```typescript
db.principal.findMany({ select: { id: true } }).execute()
db.principal.findOne({ principalId: '<UUID>', select: { id: true } }).execute()
db.principal.update({ where: { principalId: '<UUID>' }, data: { apiKeyMaxDuration: '<Interval>' }, select: { id: true } }).execute()
db.principal.delete({ where: { principalId: '<UUID>' } }).execute()
```

## Examples

### List all principal records

```typescript
const items = await db.principal.findMany({
  select: { principalId: true, apiKeyMaxDuration: true }
}).execute();
```
