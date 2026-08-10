# appMembershipProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Every profile a membership holds; memberships.profile_id points at one of them

## Usage

```typescript
db.appMembershipProfile.findMany({ select: { id: true } }).execute()
db.appMembershipProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appMembershipProfile.create({ data: { actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.appMembershipProfile.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.appMembershipProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appMembershipProfile records

```typescript
const items = await db.appMembershipProfile.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a appMembershipProfile

```typescript
const item = await db.appMembershipProfile.create({
  data: { actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
