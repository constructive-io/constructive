# platformConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed

## Usage

```typescript
db.platformConfig.findMany({ select: { id: true } }).execute()
db.platformConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformConfig.create({ data: { namespaceId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' }, select: { id: true } }).execute()
db.platformConfig.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.platformConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformConfig records

```typescript
const items = await db.platformConfig.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a platformConfig

```typescript
const item = await db.platformConfig.create({
  data: { namespaceId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
