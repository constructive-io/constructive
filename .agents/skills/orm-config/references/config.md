# config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
db.config.findMany({ select: { id: true } }).execute()
db.config.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.config.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' }, select: { id: true } }).execute()
db.config.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.config.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all config records

```typescript
const items = await db.config.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a config

```typescript
const item = await db.config.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', provider: '<String>', value: '<String>' },
  select: { id: true }
}).execute();
```
