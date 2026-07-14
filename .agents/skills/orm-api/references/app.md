# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Mobile and native app configuration linked to a site, including store links and identifiers

## Usage

```typescript
db.app.findMany({ select: { id: true } }).execute()
db.app.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.app.create({ data: { appIdPrefix: '<String>', appImage: '<Image>', appStoreId: '<String>', appStoreLink: '<Url>', databaseId: '<UUID>', name: '<String>', playStoreLink: '<Url>', siteId: '<UUID>' }, select: { id: true } }).execute()
db.app.update({ where: { id: '<UUID>' }, data: { appIdPrefix: '<String>' }, select: { id: true } }).execute()
db.app.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all app records

```typescript
const items = await db.app.findMany({
  select: { id: true, appIdPrefix: true }
}).execute();
```

### Create a app

```typescript
const item = await db.app.create({
  data: { appIdPrefix: '<String>', appImage: '<Image>', appStoreId: '<String>', appStoreLink: '<Url>', databaseId: '<UUID>', name: '<String>', playStoreLink: '<Url>', siteId: '<UUID>' },
  select: { id: true }
}).execute();
```
