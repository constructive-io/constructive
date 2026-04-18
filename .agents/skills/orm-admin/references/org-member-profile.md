# orgMemberProfile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-membership profile information visible to other entity members (display name, email, title, bio, avatar)

## Usage

```typescript
db.orgMemberProfile.findMany({ select: { id: true } }).execute()
db.orgMemberProfile.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgMemberProfile.create({ data: { membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' }, select: { id: true } }).execute()
db.orgMemberProfile.update({ where: { id: '<UUID>' }, data: { membershipId: '<UUID>' }, select: { id: true } }).execute()
db.orgMemberProfile.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgMemberProfile records

```typescript
const items = await db.orgMemberProfile.findMany({
  select: { id: true, membershipId: true }
}).execute();
```

### Create a orgMemberProfile

```typescript
const item = await db.orgMemberProfile.create({
  data: { membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' },
  select: { id: true }
}).execute();
```
