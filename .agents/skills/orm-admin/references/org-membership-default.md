# orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
db.orgMembershipDefault.findMany({ select: { id: true } }).execute()
db.orgMembershipDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMembershipDefault records

```typescript
const items = await db.orgMembershipDefault.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a orgMembershipDefault

```typescript
const item = await db.orgMembershipDefault.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
