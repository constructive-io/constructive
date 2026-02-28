# orm-app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for App records

## Usage

```typescript
db.app.findMany({ select: { id: true } }).execute()
db.app.findOne({ id: '<value>', select: { id: true } }).execute()
db.app.create({ data: { databaseId: '<value>', siteId: '<value>', name: '<value>', appImage: '<value>', appStoreLink: '<value>', appStoreId: '<value>', appIdPrefix: '<value>', playStoreLink: '<value>' }, select: { id: true } }).execute()
db.app.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.app.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all app records

```typescript
const items = await db.app.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a app

```typescript
const item = await db.app.create({
  data: { databaseId: 'value', siteId: 'value', name: 'value', appImage: 'value', appStoreLink: 'value', appStoreId: 'value', appIdPrefix: 'value', playStoreLink: 'value' },
  select: { id: true }
}).execute();
```
