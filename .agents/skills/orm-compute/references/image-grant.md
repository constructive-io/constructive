# imageGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a catalog image usable by one scope

## Usage

```typescript
db.imageGrant.findMany({ select: { id: true } }).execute()
db.imageGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.imageGrant.create({ data: { actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.imageGrant.update({ where: { id: '<UUID>' }, data: { actions: '<String>' }, select: { id: true } }).execute()
db.imageGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all imageGrant records

```typescript
const items = await db.imageGrant.findMany({
  select: { id: true, actions: true }
}).execute();
```

### Create a imageGrant

```typescript
const item = await db.imageGrant.create({
  data: { actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', imageId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
