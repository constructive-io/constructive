# app

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App aggregates: thin identity rows whose components are global catalog references

## Usage

```typescript
db.app.findMany({ select: { id: true } }).execute()
db.app.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.app.create({ data: { config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', status: '<String>', title: '<String>' }, select: { id: true } }).execute()
db.app.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute()
db.app.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all app records

```typescript
const items = await db.app.findMany({
  select: { id: true, config: true }
}).execute();
```

### Create a app

```typescript
const item = await db.app.create({
  data: { config: '<JSON>', databaseId: '<UUID>', description: '<String>', isPublished: '<Boolean>', name: '<String>', status: '<String>', title: '<String>' },
  select: { id: true }
}).execute();
```
