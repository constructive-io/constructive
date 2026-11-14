# serviceBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed platform service (BuildKit, hosted Git) for a lane (realm) — the reconciler projects its in-cluster Service address into the namespace config

## Usage

```typescript
db.serviceBinding.findMany({ select: { id: true } }).execute()
db.serviceBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.serviceBinding.create({ data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', installationScope: '<String>', kind: '<String>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.serviceBinding.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.serviceBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all serviceBinding records

```typescript
const items = await db.serviceBinding.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a serviceBinding

```typescript
const item = await db.serviceBinding.create({
  data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', installationScope: '<String>', kind: '<String>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
