# platformRegistryBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a namespace to an installed container registry for a lane (realm) — the reconciler projects that registry's credentials into the namespace as an image pull secret

## Usage

```typescript
db.platformRegistryBinding.findMany({ select: { id: true } }).execute()
db.platformRegistryBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRegistryBinding.create({ data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformRegistryBinding.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.platformRegistryBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRegistryBinding records

```typescript
const items = await db.platformRegistryBinding.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a platformRegistryBinding

```typescript
const item = await db.platformRegistryBinding.create({
  data: { createdBy: '<UUID>', createdByPrincipal: '<UUID>', metadata: '<JSON>', namespaceId: '<UUID>', observedCredentialVersion: '<String>', pullSecretName: '<String>', realm: '<String>', registryHost: '<String>', registryId: '<UUID>', status: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
