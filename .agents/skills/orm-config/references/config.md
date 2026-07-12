# config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
db.config.findMany({ select: { id: true } }).execute()
db.config.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.config.create({ data: { namespaceId: '<UUID>', databaseId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' }, select: { id: true } }).execute()
db.config.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.config.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all config records

```typescript
const items = await db.config.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a config

```typescript
const item = await db.config.create({
  data: { namespaceId: '<UUID>', databaseId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
