# site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Top-level site configuration: branding assets, title, and description for a deployed application

## Usage

```typescript
db.site.findMany({ select: { id: true } }).execute()
db.site.findOne({ id: '<value>', select: { id: true } }).execute()
db.site.create({ data: { databaseId: '<value>', title: '<value>', description: '<value>', ogImage: '<value>', favicon: '<value>', appleTouchIcon: '<value>', logo: '<value>', dbname: '<value>' }, select: { id: true } }).execute()
db.site.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.site.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all site records

```typescript
const items = await db.site.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a site

```typescript
const item = await db.site.create({
  data: { databaseId: 'value', title: 'value', description: 'value', ogImage: 'value', favicon: 'value', appleTouchIcon: 'value', logo: 'value', dbname: 'value' },
  select: { id: true }
}).execute();
```
