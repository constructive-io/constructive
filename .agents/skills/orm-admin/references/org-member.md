# orgMember

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Simplified view of active members in an entity, used for listing who belongs to an org or group

## Usage

```typescript
db.orgMember.findMany({ select: { id: true } }).execute()
db.orgMember.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMember.create({ data: { isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgMember.update({ where: { id: '<UUID>' }, data: { isAdmin: '<Boolean>' }, select: { id: true } }).execute()
db.orgMember.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMember records

```typescript
const items = await db.orgMember.findMany({
  select: { id: true, isAdmin: true }
}).execute();
```

### Create a orgMember

```typescript
const item = await db.orgMember.create({
  data: { isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
