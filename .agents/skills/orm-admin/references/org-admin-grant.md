# orgAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
db.orgAdminGrant.findMany({ select: { id: true } }).execute()
db.orgAdminGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute()
db.orgAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.orgAdminGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgAdminGrant records

```typescript
const items = await db.orgAdminGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a orgAdminGrant

```typescript
const item = await db.orgAdminGrant.create({
  data: { isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' },
  select: { id: true }
}).execute();
```
