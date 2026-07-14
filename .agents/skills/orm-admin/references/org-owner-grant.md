# orgOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of ownership transfers and grants between members

## Usage

```typescript
db.orgOwnerGrant.findMany({ select: { id: true } }).execute()
db.orgOwnerGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgOwnerGrant.create({ data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.orgOwnerGrant.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgOwnerGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgOwnerGrant records

```typescript
const items = await db.orgOwnerGrant.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgOwnerGrant

```typescript
const item = await db.orgOwnerGrant.create({
  data: { actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
