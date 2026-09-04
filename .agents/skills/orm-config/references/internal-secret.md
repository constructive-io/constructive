# internalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InternalSecret records

## Usage

```typescript
db.internalSecret.findMany({ select: { id: true } }).execute()
db.internalSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.internalSecret.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', realm: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute()
db.internalSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.internalSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all internalSecret records

```typescript
const items = await db.internalSecret.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a internalSecret

```typescript
const item = await db.internalSecret.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', realm: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
