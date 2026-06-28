# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions.

## Usage

```typescript
db.principalScopeOverride.findMany({ select: { id: true } }).execute()
db.principalScopeOverride.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalScopeOverride.create({ data: { principalId: '<UUID>', membershipType: '<Int>', allowedMask: '<BitString>', isAdmin: '<Boolean>', isReadOnly: '<Boolean>' }, select: { id: true } }).execute()
db.principalScopeOverride.update({ where: { id: '<UUID>' }, data: { principalId: '<UUID>' }, select: { id: true } }).execute()
db.principalScopeOverride.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalScopeOverride records

```typescript
const items = await db.principalScopeOverride.findMany({
  select: { id: true, principalId: true }
}).execute();
```

### Create a principalScopeOverride

```typescript
const item = await db.principalScopeOverride.create({
  data: { principalId: '<UUID>', membershipType: '<Int>', allowedMask: '<BitString>', isAdmin: '<Boolean>', isReadOnly: '<Boolean>' },
  select: { id: true }
}).execute();
```
