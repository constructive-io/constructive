# corsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries

## Usage

```typescript
db.corsSetting.findMany({ select: { id: true } }).execute()
db.corsSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.corsSetting.create({ data: { allowedOrigins: '<String>', apiId: '<UUID>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.corsSetting.update({ where: { id: '<UUID>' }, data: { allowedOrigins: '<String>' }, select: { id: true } }).execute()
db.corsSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all corsSetting records

```typescript
const items = await db.corsSetting.findMany({
  select: { id: true, allowedOrigins: true }
}).execute();
```

### Create a corsSetting

```typescript
const item = await db.corsSetting.create({
  data: { allowedOrigins: '<String>', apiId: '<UUID>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
