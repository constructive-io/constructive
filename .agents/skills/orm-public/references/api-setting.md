# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default

## Usage

```typescript
db.apiSetting.findMany({ select: { id: true } }).execute()
db.apiSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apiSetting.create({ data: { databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute()
db.apiSetting.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.apiSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apiSetting records

```typescript
const items = await db.apiSetting.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a apiSetting

```typescript
const item = await db.apiSetting.create({
  data: { databaseId: '<UUID>', apiId: '<UUID>', enableAggregates: '<Boolean>', enablePostgis: '<Boolean>', enableSearch: '<Boolean>', enableDirectUploads: '<Boolean>', enablePresignedUploads: '<Boolean>', enableManyToMany: '<Boolean>', enableConnectionFilter: '<Boolean>', enableLtree: '<Boolean>', enableLlm: '<Boolean>', enableRealtime: '<Boolean>', enableBulk: '<Boolean>', options: '<JSON>' },
  select: { id: true }
}).execute();
```
