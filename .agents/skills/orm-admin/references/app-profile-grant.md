# appProfileGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of profile assignments and revocations for members

## Usage

```typescript
db.appProfileGrant.findMany({ select: { id: true } }).execute()
db.appProfileGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appProfileGrant.create({ data: { grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileGrant.update({ where: { id: '<UUID>' }, data: { grantorId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appProfileGrant records

```typescript
const items = await db.appProfileGrant.findMany({
  select: { id: true, grantorId: true }
}).execute();
```

### Create a appProfileGrant

```typescript
const item = await db.appProfileGrant.create({
  data: { grantorId: '<UUID>', isGrant: '<Boolean>', membershipId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
