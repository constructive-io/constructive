# platformCorsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-wide and per-API CORS origin configuration; NULL api_id means scope-wide default

## Usage

```typescript
db.platformCorsSetting.findMany({ select: { id: true } }).execute()
db.platformCorsSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformCorsSetting.create({ data: { allowedOrigins: '<String>', apiId: '<UUID>' }, select: { id: true } }).execute()
db.platformCorsSetting.update({ where: { id: '<UUID>' }, data: { allowedOrigins: '<String>' }, select: { id: true } }).execute()
db.platformCorsSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformCorsSetting records

```typescript
const items = await db.platformCorsSetting.findMany({
  select: { id: true, allowedOrigins: true }
}).execute();
```

### Create a platformCorsSetting

```typescript
const item = await db.platformCorsSetting.create({
  data: { allowedOrigins: '<String>', apiId: '<UUID>' },
  select: { id: true }
}).execute();
```
