# registryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a registry usable by one scope

## Usage

```typescript
db.registryGrant.findMany({ select: { id: true } }).execute()
db.registryGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.registryGrant.create({ data: { actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.registryGrant.update({ where: { id: '<UUID>' }, data: { actions: '<String>' }, select: { id: true } }).execute()
db.registryGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all registryGrant records

```typescript
const items = await db.registryGrant.findMany({
  select: { id: true, actions: true }
}).execute();
```

### Create a registryGrant

```typescript
const item = await db.registryGrant.create({
  data: { actions: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
