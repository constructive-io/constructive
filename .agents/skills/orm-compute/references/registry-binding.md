# registryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed container registry for a lane (realm) — the reconciler projects that registry's credentials into the namespace as an image pull secret

## Usage

```typescript
db.registryBinding.findMany({ select: { id: true } }).execute()
db.registryBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.registryBinding.create({ data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.registryBinding.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.registryBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all registryBinding records

```typescript
const items = await db.registryBinding.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a registryBinding

```typescript
const item = await db.registryBinding.create({
  data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
