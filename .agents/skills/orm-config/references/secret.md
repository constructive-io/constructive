# secret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Secret records

## Usage

```typescript
db.secret.findMany({ select: { id: true } }).execute()
db.secret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.secret.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' }, select: { id: true } }).execute()
db.secret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.secret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all secret records

```typescript
const items = await db.secret.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a secret

```typescript
const item = await db.secret.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', retiredAt: '<Datetime>', rotatedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
