# platformSiteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site surface

## Usage

```typescript
db.platformSiteMetadatum.findMany({ select: { id: true } }).execute()
db.platformSiteMetadatum.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteMetadatum.create({ data: { description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' }, select: { id: true } }).execute()
db.platformSiteMetadatum.update({ where: { id: '<UUID>' }, data: { description: '<String>' }, select: { id: true } }).execute()
db.platformSiteMetadatum.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteMetadatum records

```typescript
const items = await db.platformSiteMetadatum.findMany({
  select: { id: true, description: true }
}).execute();
```

### Create a platformSiteMetadatum

```typescript
const item = await db.platformSiteMetadatum.create({
  data: { description: '<String>', ogImage: '<Image>', siteId: '<UUID>', title: '<String>' },
  select: { id: true }
}).execute();
```
