# orgMemberProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-membership profile information visible to other entity members (display name, email, title, bio, avatar)

## Usage

```typescript
db.orgMemberProfile.findMany({ select: { id: true } }).execute()
db.orgMemberProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMemberProfile.create({ data: { actorId: '<UUID>', bio: '<String>', displayName: '<String>', email: '<String>', entityId: '<UUID>', membershipId: '<UUID>', profilePicture: '<Image>', title: '<String>' }, select: { id: true } }).execute()
db.orgMemberProfile.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.orgMemberProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMemberProfile records

```typescript
const items = await db.orgMemberProfile.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a orgMemberProfile

```typescript
const item = await db.orgMemberProfile.create({
  data: { actorId: '<UUID>', bio: '<String>', displayName: '<String>', email: '<String>', entityId: '<UUID>', membershipId: '<UUID>', profilePicture: '<Image>', title: '<String>' },
  select: { id: true }
}).execute();
```
