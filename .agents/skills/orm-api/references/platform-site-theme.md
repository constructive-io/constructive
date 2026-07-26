# platformSiteTheme

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Theme (colors, fonts, design tokens) for a site surface

## Usage

```typescript
db.platformSiteTheme.findMany({ select: { id: true } }).execute()
db.platformSiteTheme.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteTheme.create({ data: { siteId: '<UUID>', theme: '<JSON>' }, select: { id: true } }).execute()
db.platformSiteTheme.update({ where: { id: '<UUID>' }, data: { siteId: '<UUID>' }, select: { id: true } }).execute()
db.platformSiteTheme.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteTheme records

```typescript
const items = await db.platformSiteTheme.findMany({
  select: { id: true, siteId: true }
}).execute();
```

### Create a platformSiteTheme

```typescript
const item = await db.platformSiteTheme.create({
  data: { siteId: '<UUID>', theme: '<JSON>' },
  select: { id: true }
}).execute();
```
