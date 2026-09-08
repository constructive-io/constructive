# appInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppInternalSecret records

## Usage

```typescript
db.appInternalSecret.findMany({ select: { id: true } }).execute()
db.appInternalSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appInternalSecret.create({ data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', realm: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute()
db.appInternalSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.appInternalSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appInternalSecret records

```typescript
const items = await db.appInternalSecret.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a appInternalSecret

```typescript
const item = await db.appInternalSecret.create({
  data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', realm: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
