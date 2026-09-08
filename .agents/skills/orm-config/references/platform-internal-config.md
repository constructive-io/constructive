# platformInternalConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

platform-level plaintext key-value config store; database-resident, never projected into Kubernetes

## Usage

```typescript
db.platformInternalConfig.findMany({ select: { id: true } }).execute()
db.platformInternalConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInternalConfig.create({ data: { annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' }, select: { id: true } }).execute()
db.platformInternalConfig.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformInternalConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInternalConfig records

```typescript
const items = await db.platformInternalConfig.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformInternalConfig

```typescript
const item = await db.platformInternalConfig.create({
  data: { annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>', labels: '<JSON>', name: '<String>', provider: '<String>', realm: '<String>', value: '<String>' },
  select: { id: true }
}).execute();
```
