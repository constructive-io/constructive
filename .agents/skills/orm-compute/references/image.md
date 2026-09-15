# image

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Container image catalog: images available to run as functions, resources, and builds

## Usage

```typescript
db.image.findMany({ select: { id: true } }).execute()
db.image.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.image.create({ data: { createdByPrincipal: '<UUID>', databaseId: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.image.update({ where: { id: '<UUID>' }, data: { createdByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.image.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all image records

```typescript
const items = await db.image.findMany({
  select: { id: true, createdByPrincipal: true }
}).execute();
```

### Create a image

```typescript
const item = await db.image.create({
  data: { createdByPrincipal: '<UUID>', databaseId: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
