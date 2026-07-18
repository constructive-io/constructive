# platformResourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback

## Usage

```typescript
db.platformResourceInstallation.findMany({ select: { id: true } }).execute()
db.platformResourceInstallation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceInstallation.create({ data: { commitId: '<UUID>', createdBy: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceInstallation.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.platformResourceInstallation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceInstallation records

```typescript
const items = await db.platformResourceInstallation.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a platformResourceInstallation

```typescript
const item = await db.platformResourceInstallation.create({
  data: { commitId: '<UUID>', createdBy: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
