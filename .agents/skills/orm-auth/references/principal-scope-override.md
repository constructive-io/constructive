# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions.

## Usage

```typescript
db.principalScopeOverride.findMany({ select: { id: true } }).execute()
db.principalScopeOverride.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalScopeOverride.create({ data: { allowedMask: '<BitString>', isActive: '<Boolean>', isReadOnly: '<Boolean>', membershipType: '<Int>', principalId: '<UUID>', useAdminOwner: '<Boolean>' }, select: { id: true } }).execute()
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

### Create a principalScopeOverride

```typescript
const item = await db.principalScopeOverride.create({
  data: { allowedMask: '<BitString>', isActive: '<Boolean>', isReadOnly: '<Boolean>', membershipType: '<Int>', principalId: '<UUID>', useAdminOwner: '<Boolean>' },
  select: { id: true }
}).execute();
```
