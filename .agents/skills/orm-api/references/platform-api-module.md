# platformApiModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Server-side module configuration for an API surface; stores module name and JSON settings

## Usage

```typescript
db.platformApiModule.findMany({ select: { id: true } }).execute()
db.platformApiModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformApiModule.create({ data: { apiId: '<UUID>', data: '<JSON>', name: '<String>' }, select: { id: true } }).execute()
db.platformApiModule.update({ where: { id: '<UUID>' }, data: { apiId: '<UUID>' }, select: { id: true } }).execute()
db.platformApiModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformApiModule records

```typescript
const items = await db.platformApiModule.findMany({
  select: { id: true, apiId: true }
}).execute();
```

### Create a platformApiModule

```typescript
const item = await db.platformApiModule.create({
  data: { apiId: '<UUID>', data: '<JSON>', name: '<String>' },
  select: { id: true }
}).execute();
```
