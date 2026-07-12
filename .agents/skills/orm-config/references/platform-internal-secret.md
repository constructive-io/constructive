# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformInternalSecret records

## Usage

```typescript
db.platformInternalSecret.findMany({ select: { id: true } }).execute()
db.platformInternalSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInternalSecret.create({ data: { name: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformInternalSecret.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.platformInternalSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInternalSecret records

```typescript
const items = await db.platformInternalSecret.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a platformInternalSecret

```typescript
const item = await db.platformInternalSecret.create({
  data: { name: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
