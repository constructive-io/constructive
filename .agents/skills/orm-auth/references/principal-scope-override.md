# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-scope capability overrides for principals. No row = full access; row exists = apply restrictions.

## Usage

```typescript
db.principalScopeOverride.findMany({ select: { id: true } }).execute()
db.principalScopeOverride.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalScopeOverride.update({ where: { id: '<UUID>' }, data: { allowedMask: '<BitString>' }, select: { id: true } }).execute()
db.principalScopeOverride.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalScopeOverride records

```typescript
const items = await db.principalScopeOverride.findMany({
  select: { id: true, allowedMask: true }
}).execute();
```
