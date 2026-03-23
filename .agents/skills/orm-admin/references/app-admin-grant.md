# appAdminGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Records of admin role grants and revocations between members

## Usage

```typescript
db.appAdminGrant.findMany({ select: { id: true } }).execute()
db.appAdminGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appAdminGrant.create({ data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' }, select: { id: true } }).execute()
db.appAdminGrant.update({ where: { id: '<UUID>' }, data: { isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.appAdminGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appAdminGrant records

```typescript
const items = await db.appAdminGrant.findMany({
  select: { id: true, isGrant: true }
}).execute();
```

### Create a appAdminGrant

```typescript
const item = await db.appAdminGrant.create({
  data: { isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' },
  select: { id: true }
}).execute();
```
