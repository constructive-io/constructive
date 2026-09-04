# platformRegistryGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Grants that make a registry usable by one scope

## Usage

```typescript
db.platformRegistryGrant.findMany({ select: { id: true } }).execute()
db.platformRegistryGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformRegistryGrant.create({ data: { actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformRegistryGrant.update({ where: { id: '<UUID>' }, data: { actions: '<String>' }, select: { id: true } }).execute()
db.platformRegistryGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformRegistryGrant records

```typescript
const items = await db.platformRegistryGrant.findMany({
  select: { id: true, actions: true }
}).execute();
```

### Create a platformRegistryGrant

```typescript
const item = await db.platformRegistryGrant.create({
  data: { actions: '<String>', createdByPrincipal: '<UUID>', expiresAt: '<Datetime>', grantedBy: '<UUID>', granteeKey: '<UUID>', granteeScope: '<String>', registryId: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
