# platformSite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.platformSite.findMany({ select: { id: true } }).execute()
db.platformSite.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSite.create({ data: { activeCommitId: '<UUID>', bucketId: '<UUID>', description: '<String>', installationId: '<UUID>', installationMemberSlug: '<String>', isPublished: '<Boolean>', name: '<String>', resourceId: '<UUID>', title: '<String>' }, select: { id: true } }).execute()
db.platformSite.update({ where: { id: '<UUID>' }, data: { activeCommitId: '<UUID>' }, select: { id: true } }).execute()
db.platformSite.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSite records

```typescript
const items = await db.platformSite.findMany({
  select: { id: true, activeCommitId: true }
}).execute();
```

### Create a platformSite

```typescript
const item = await db.platformSite.create({
  data: { activeCommitId: '<UUID>', bucketId: '<UUID>', description: '<String>', installationId: '<UUID>', installationMemberSlug: '<String>', isPublished: '<Boolean>', name: '<String>', resourceId: '<UUID>', title: '<String>' },
  select: { id: true }
}).execute();
```
