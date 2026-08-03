# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme (colors, fonts, design tokens) for a site surface

## Usage

```typescript
db.siteTheme.findMany({ select: { id: true } }).execute()
db.siteTheme.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteTheme.create({ data: { commitId: '<UUID>', databaseId: '<UUID>', isActive: '<Boolean>', name: '<String>', siteId: '<UUID>', storeId: '<UUID>', theme: '<JSON>' }, select: { id: true } }).execute()
db.siteTheme.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.siteTheme.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteTheme records

```typescript
const items = await db.siteTheme.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a siteTheme

```typescript
const item = await db.siteTheme.create({
  data: { commitId: '<UUID>', databaseId: '<UUID>', isActive: '<Boolean>', name: '<String>', siteId: '<UUID>', storeId: '<UUID>', theme: '<JSON>' },
  select: { id: true }
}).execute();
```
