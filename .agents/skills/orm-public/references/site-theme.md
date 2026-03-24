# siteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme configuration for a site; stores design tokens, colors, and typography as JSONB

## Usage

```typescript
db.siteTheme.findMany({ select: { id: true } }).execute()
db.siteTheme.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteTheme.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' }, select: { id: true } }).execute()
db.siteTheme.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.siteTheme.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteTheme records

```typescript
const items = await db.siteTheme.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a siteTheme

```typescript
const item = await db.siteTheme.create({
  data: { databaseId: '<UUID>', siteId: '<UUID>', theme: '<JSON>' },
  select: { id: true }
}).execute();
```
