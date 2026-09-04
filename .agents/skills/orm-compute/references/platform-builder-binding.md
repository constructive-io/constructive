# platformBuilderBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed BuildKit resource for a lane (realm) — the reconciler projects its in-cluster Service address as BUILDKIT_HOST

## Usage

```typescript
db.platformBuilderBinding.findMany({ select: { id: true } }).execute()
db.platformBuilderBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformBuilderBinding.create({ data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformBuilderBinding.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.platformBuilderBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformBuilderBinding records

```typescript
const items = await db.platformBuilderBinding.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a platformBuilderBinding

```typescript
const item = await db.platformBuilderBinding.create({
  data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', installationId: '<UUID>', lastError: '<String>', metadata: '<JSON>', namespaceId: '<UUID>', observedHost: '<String>', realm: '<String>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
