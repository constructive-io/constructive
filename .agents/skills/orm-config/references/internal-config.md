# internalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

-level plaintext key-value config store; database-resident, never projected into Kubernetes

## Usage

```typescript
db.internalConfig.findMany({ select: { id: true } }).execute()
db.internalConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.internalConfig.create({ data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' }, select: { id: true } }).execute()
db.internalConfig.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.internalConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all internalConfig records

```typescript
const items = await db.internalConfig.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a internalConfig

```typescript
const item = await db.internalConfig.create({
  data: { annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' },
  select: { id: true }
}).execute();
```
