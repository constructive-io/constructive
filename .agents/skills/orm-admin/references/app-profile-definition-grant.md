# appProfileDefinitionGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from profile definitions

## Usage

```typescript
db.appProfileDefinitionGrant.findMany({ select: { id: true } }).execute()
db.appProfileDefinitionGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appProfileDefinitionGrant.create({ data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileDefinitionGrant.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileDefinitionGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appProfileDefinitionGrant records

```typescript
const items = await db.appProfileDefinitionGrant.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a appProfileDefinitionGrant

```typescript
const item = await db.appProfileDefinitionGrant.create({
  data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
