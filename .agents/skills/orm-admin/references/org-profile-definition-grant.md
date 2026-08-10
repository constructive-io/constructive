# orgProfileDefinitionGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from profile definitions

## Usage

```typescript
db.orgProfileDefinitionGrant.findMany({ select: { id: true } }).execute()
db.orgProfileDefinitionGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgProfileDefinitionGrant.create({ data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileDefinitionGrant.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileDefinitionGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgProfileDefinitionGrant records

```typescript
const items = await db.orgProfileDefinitionGrant.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a orgProfileDefinitionGrant

```typescript
const item = await db.orgProfileDefinitionGrant.create({
  data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
