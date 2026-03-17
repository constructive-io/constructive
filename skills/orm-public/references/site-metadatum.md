# siteMetadatum

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

SEO and social sharing metadata for a site: page title, description, and Open Graph image

## Usage

```typescript
db.siteMetadatum.findMany({ select: { id: true } }).execute()
db.siteMetadatum.findOne({ id: '<value>', select: { id: true } }).execute()
db.siteMetadatum.create({ data: { databaseId: '<value>', siteId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', titleTrgmSimilarity: '<value>', descriptionTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.siteMetadatum.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.siteMetadatum.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', siteId: 'value', title: 'value', description: 'value', ogImage: 'value', titleTrgmSimilarity: 'value', descriptionTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
