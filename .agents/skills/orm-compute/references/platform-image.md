# platformImage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Container image catalog: images available to run as functions, resources, and builds

## Usage

```typescript
db.platformImage.findMany({ select: { id: true } }).execute()
db.platformImage.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformImage.create({ data: { createdByPrincipal: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformImage.update({ where: { id: '<UUID>' }, data: { createdByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformImage.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformImage records

```typescript
const items = await db.platformImage.findMany({
  select: { id: true, createdByPrincipal: true }
}).execute();
```

### Create a platformImage

```typescript
const item = await db.platformImage.create({
  data: { createdByPrincipal: '<UUID>', description: '<String>', digest: '<String>', expiresAt: '<Datetime>', isPublished: '<Boolean>', labels: '<JSON>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', platformOnly: '<Boolean>', registryHost: '<String>', repository: '<String>', runtime: '<String>', tag: '<String>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
