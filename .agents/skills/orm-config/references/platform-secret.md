# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformSecret records

## Usage

```typescript
db.platformSecret.findMany({ select: { id: true } }).execute()
db.platformSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSecret.create({ data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSecret records

```typescript
const items = await db.platformSecret.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformSecret

```typescript
const item = await db.platformSecret.create({
  data: { annotations: '<JSON>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
