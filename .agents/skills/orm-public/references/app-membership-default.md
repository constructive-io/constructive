# appMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default membership settings per entity, controlling initial approval and verification state for new members

## Usage

```typescript
db.appMembershipDefault.findMany({ select: { id: true } }).execute()
db.appMembershipDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appMembershipDefault.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' }, select: { id: true } }).execute()
db.appMembershipDefault.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.appMembershipDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appMembershipDefault records

```typescript
const items = await db.appMembershipDefault.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a appMembershipDefault

```typescript
const item = await db.appMembershipDefault.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' },
  select: { id: true }
}).execute();
```
