# appOwnerGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of ownership transfers and grants between members

## Usage

```typescript
db.appOwnerGrant.findMany({ select: { id: true } }).execute()
db.appOwnerGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appOwnerGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute()
db.appOwnerGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.appOwnerGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appOwnerGrant records

```typescript
const items = await db.appOwnerGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a appOwnerGrant

```typescript
const item = await db.appOwnerGrant.create({
  data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' },
  select: { id: true }
}).execute();
```
