# platformInfraObject

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children

## Usage

```typescript
db.platformInfraObject.findMany({ select: { id: true } }).execute()
db.platformInfraObject.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformInfraObject.create({ data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' }, select: { id: true } }).execute()
db.platformInfraObject.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.platformInfraObject.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformInfraObject records

```typescript
const items = await db.platformInfraObject.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a platformInfraObject

```typescript
const item = await db.platformInfraObject.create({
  data: { data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' },
  select: { id: true }
}).execute();
```
