# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformSecret records

## Usage

```typescript
db.platformSecret.findMany({ select: { id: true } }).execute()
db.platformSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSecret.create({ data: { name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformSecret.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.platformSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSecret records

```typescript
const items = await db.platformSecret.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a platformSecret

```typescript
const item = await db.platformSecret.create({
  data: { name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
