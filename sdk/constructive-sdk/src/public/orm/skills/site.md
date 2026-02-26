# orm-site

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Site records

## Usage

```typescript
db.site.findMany({ select: { id: true } }).execute()
db.site.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
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
