# platformRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Artifact registries this scope pulls from or pushes to (OCI images, npm packages), platform-run or external

## Usage

```typescript
db.platformRegistry.findMany({ select: { id: true } }).execute()
db.platformRegistry.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRegistry.create({ data: { authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformRegistry.update({ where: { id: '<UUID>' }, data: { authMode: '<String>' }, select: { id: true } }).execute()
db.platformRegistry.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRegistry records

```typescript
const items = await db.platformRegistry.findMany({
  select: { id: true, authMode: true }
}).execute();
```

### Create a platformRegistry

```typescript
const item = await db.platformRegistry.create({
  data: { authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
