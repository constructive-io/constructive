# registry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Artifact registries this scope pulls from or pushes to (OCI images, npm packages), platform-run or external

## Usage

```typescript
db.registry.findMany({ select: { id: true } }).execute()
db.registry.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.registry.create({ data: { authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', databaseId: '<UUID>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.registry.update({ where: { id: '<UUID>' }, data: { authMode: '<String>' }, select: { id: true } }).execute()
db.registry.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all registry records

```typescript
const items = await db.registry.findMany({
  select: { id: true, authMode: true }
}).execute();
```

### Create a registry

```typescript
const item = await db.registry.create({
  data: { authMode: '<String>', basePath: '<String>', createdByPrincipal: '<UUID>', credentialSecretName: '<String>', databaseId: '<UUID>', host: '<String>', installationId: '<UUID>', isPublished: '<Boolean>', kind: '<String>', labels: '<JSON>', lastError: '<String>', metadata: '<JSON>', name: '<String>', platformOnly: '<Boolean>', role: '<String>', status: '<String>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
