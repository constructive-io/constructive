# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Site surfaces exposed by this scope; publication makes a surface bindable from other scopes

## Usage

```typescript
db.site.findMany({ select: { id: true } }).execute()
db.site.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.site.create({ data: { config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', title: '<String>' }, select: { id: true } }).execute()
db.site.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.site.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all site records

```typescript
const items = await db.site.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a site

```typescript
const item = await db.site.create({
  data: { config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', title: '<String>' },
  select: { id: true }
}).execute();
```
