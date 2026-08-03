# siteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named, retargetable deep links owned by a site surface (served at the deep-link path prefix; app interception via site_app_links)

## Usage

```typescript
db.siteDeepLink.findMany({ select: { id: true } }).execute()
db.siteDeepLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteDeepLink.create({ data: { appPath: '<String>', databaseId: '<UUID>', fallbackUrl: '<String>', metadata: '<JSON>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' }, select: { id: true } }).execute()
db.siteDeepLink.update({ where: { id: '<UUID>' }, data: { appPath: '<String>' }, select: { id: true } }).execute()
db.siteDeepLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteDeepLink records

```typescript
const items = await db.siteDeepLink.findMany({
  select: { id: true, appPath: true }
}).execute();
```

### Create a siteDeepLink

```typescript
const item = await db.siteDeepLink.create({
  data: { appPath: '<String>', databaseId: '<UUID>', fallbackUrl: '<String>', metadata: '<JSON>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' },
  select: { id: true }
}).execute();
```
