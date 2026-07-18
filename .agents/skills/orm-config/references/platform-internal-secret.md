# platformInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformInternalSecret records

## Usage

```typescript
db.platformInternalSecret.findMany({ select: { id: true } }).execute()
db.platformInternalSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInternalSecret.create({ data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformInternalSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformInternalSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInternalSecret records

```typescript
const items = await db.platformInternalSecret.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformInternalSecret

```typescript
const item = await db.platformInternalSecret.create({
  data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
