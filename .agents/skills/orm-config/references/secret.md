# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Secret records

## Usage

```typescript
db.secret.findMany({ select: { id: true } }).execute()
db.secret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.secret.create({ data: { databaseId: '<UUID>', name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' }, select: { id: true } }).execute()
db.secret.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.secret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all secret records

```typescript
const items = await db.secret.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a secret

```typescript
const item = await db.secret.create({
  data: { databaseId: '<UUID>', name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
