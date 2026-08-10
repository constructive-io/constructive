# orgProfileGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of profile assignments and revocations for members

## Usage

```typescript
db.orgProfileGrant.findMany({ select: { id: true } }).execute()
db.orgProfileGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgProfileGrant.create({ data: { entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileGrant.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgProfileGrant records

```typescript
const items = await db.orgProfileGrant.findMany({
  select: { id: true, entityId: true }
}).execute();
```

### Create a orgProfileGrant

```typescript
const item = await db.orgProfileGrant.create({
  data: { entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
