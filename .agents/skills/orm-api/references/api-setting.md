# apiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-API feature flag overrides; NULL columns inherit from database_settings, explicit true/false overrides the database default

## Usage

```typescript
db.apiSetting.findMany({ select: { id: true } }).execute()
db.apiSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.apiSetting.create({ data: { apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' }, select: { id: true } }).execute()
db.apiSetting.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute()
db.apiSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all apiSetting records

```typescript
const items = await db.apiSetting.findMany({
  select: { id: true, apiId: true }
}).execute();
```

### Create a apiSetting

```typescript
const item = await db.apiSetting.create({
  data: { apiId: '<UUID>', databaseId: '<UUID>', enableAggregates: '<Boolean>', enableBulk: '<Boolean>', enableConnectionFilter: '<Boolean>', enableDirectUploads: '<Boolean>', enableI18N: '<Boolean>', enableLlm: '<Boolean>', enableLtree: '<Boolean>', enableManyToMany: '<Boolean>', enablePostgis: '<Boolean>', enablePresignedUploads: '<Boolean>', enableRealtime: '<Boolean>', enableSearch: '<Boolean>', options: '<JSON>' },
  select: { id: true }
}).execute();
```
