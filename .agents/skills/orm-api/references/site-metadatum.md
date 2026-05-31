# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site: page title, description, and Open Graph image

## Usage

```typescript
db.siteMetadatum.findMany({ select: { id: true } }).execute()
db.siteMetadatum.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.siteMetadatum.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>' }, select: { id: true } }).execute()
db.siteMetadatum.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.siteMetadatum.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all siteMetadatum records

```typescript
const items = await db.siteMetadatum.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a siteMetadatum

```typescript
const item = await db.siteMetadatum.create({
  data: { databaseId: '<UUID>', siteId: '<UUID>', title: '<String>', description: '<String>', ogImage: '<Image>' },
  select: { id: true }
}).execute();
```
