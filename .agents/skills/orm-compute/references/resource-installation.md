# resourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback

## Usage

```typescript
db.resourceInstallation.findMany({ select: { id: true } }).execute()
db.resourceInstallation.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceInstallation.create({ data: { commitId: '<UUID>', createdBy: '<UUID>', databaseId: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.resourceInstallation.update({ where: { id: '<UUID>' }, data: { commitId: '<UUID>' }, select: { id: true } }).execute()
db.resourceInstallation.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceInstallation records

```typescript
const items = await db.resourceInstallation.findMany({
  select: { id: true, commitId: true }
}).execute();
```

### Create a resourceInstallation

```typescript
const item = await db.resourceInstallation.create({
  data: { commitId: '<UUID>', createdBy: '<UUID>', databaseId: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
