# platformImageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a catalog image usable by one scope

## Usage

```typescript
db.platformImageGrant.findMany({ select: { id: true } }).execute()
db.platformImageGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformImageGrant.create({ data: { actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformImageGrant.update({ where: { id: '<UUID>' }, data: { actions: '<String>' }, select: { id: true } }).execute()
db.platformImageGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformImageGrant records

```typescript
const items = await db.platformImageGrant.findMany({
  select: { id: true, actions: true }
}).execute();
```

### Create a platformImageGrant

```typescript
const item = await db.platformImageGrant.create({
  data: { actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
