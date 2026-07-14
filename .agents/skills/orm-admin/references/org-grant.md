# orgGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of individual permission grants and revocations for members via bitmask

## Usage

```typescript
db.orgGrant.findMany({ select: { id: true } }).execute()
db.orgGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgGrant.create({ data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissions: '<BitString>' }, select: { id: true } }).execute()
db.orgGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgGrant records

```typescript
const items = await db.orgGrant.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgGrant

```typescript
const item = await db.orgGrant.create({
  data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', permissions: '<BitString>' },
  select: { id: true }
}).execute();
```
