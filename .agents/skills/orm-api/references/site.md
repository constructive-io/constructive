# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level site configuration: branding assets, title, and description for a deployed application

## Usage

```typescript
db.site.findMany({ select: { id: true } }).execute()
db.site.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.site.create({ data: { annotations: '<JSON>', appleTouchIcon: '<Image>', databaseId: '<UUID>', dbname: '<String>', description: '<String>', favicon: '<Attachment>', labels: '<JSON>', logo: '<Image>', ogImage: '<Image>', title: '<String>' }, select: { id: true } }).execute()
db.site.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.site.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all site records

```typescript
const items = await db.site.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a site

```typescript
const item = await db.site.create({
  data: { annotations: '<JSON>', appleTouchIcon: '<Image>', databaseId: '<UUID>', dbname: '<String>', description: '<String>', favicon: '<Attachment>', labels: '<JSON>', logo: '<Image>', ogImage: '<Image>', title: '<String>' },
  select: { id: true }
}).execute();
```
