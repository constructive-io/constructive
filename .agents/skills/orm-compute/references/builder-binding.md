# builderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed BuildKit resource for a lane (realm) — the reconciler projects its in-cluster Service address as BUILDKIT_HOST

## Usage

```typescript
db.builderBinding.findMany({ select: { id: true } }).execute()
db.builderBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.builderBinding.create({ data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.builderBinding.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.builderBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all builderBinding records

```typescript
const items = await db.builderBinding.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a builderBinding

```typescript
const item = await db.builderBinding.create({
  data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
