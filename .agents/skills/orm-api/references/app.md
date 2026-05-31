# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Mobile and native app configuration linked to a site, including store links and identifiers

## Usage

```typescript
db.app.findMany({ select: { id: true } }).execute()
db.app.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.app.create({ data: { databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', appImage: '<Image>', appStoreLink: '<Url>', appStoreId: '<String>', appIdPrefix: '<String>', playStoreLink: '<Url>' }, select: { id: true } }).execute()
db.app.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.app.delete({ where: { id: '<UUID>' } }).execute()
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
  data: { databaseId: '<UUID>', siteId: '<UUID>', name: '<String>', appImage: '<Image>', appStoreLink: '<Url>', appStoreId: '<String>', appIdPrefix: '<String>', playStoreLink: '<Url>' },
  select: { id: true }
}).execute();
```
