# platformSiteDeepLink

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Named, retargetable deep links owned by a site surface (served at the deep-link path prefix; app interception via site_app_links)

## Usage

```typescript
db.platformSiteDeepLink.findMany({ select: { id: true } }).execute()
db.platformSiteDeepLink.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteDeepLink.create({ data: { appPath: '<String>', fallbackUrl: '<String>', metadata: '<JSON>', pageId: '<UUID>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' }, select: { id: true } }).execute()
db.platformSiteDeepLink.update({ where: { id: '<UUID>' }, data: { appPath: '<String>' }, select: { id: true } }).execute()
db.platformSiteDeepLink.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteDeepLink records

```typescript
const items = await db.platformSiteDeepLink.findMany({
  select: { id: true, appPath: true }
}).execute();
```

### Create a platformSiteDeepLink

```typescript
const item = await db.platformSiteDeepLink.create({
  data: { appPath: '<String>', fallbackUrl: '<String>', metadata: '<JSON>', pageId: '<UUID>', siteId: '<UUID>', slug: '<String>', webPath: '<String>' },
  select: { id: true }
}).execute();
```
