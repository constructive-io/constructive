# orgMembershipProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Every profile a membership holds; memberships.profile_id points at one of them

## Usage

```typescript
db.orgMembershipProfile.findMany({ select: { id: true } }).execute()
db.orgMembershipProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMembershipProfile.create({ data: { actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipProfile.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgMembershipProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMembershipProfile records

```typescript
const items = await db.orgMembershipProfile.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgMembershipProfile

```typescript
const item = await db.orgMembershipProfile.create({
  data: { actorId: '<UUID>', membershipId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
