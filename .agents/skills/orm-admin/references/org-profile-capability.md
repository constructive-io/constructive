# orgProfileCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking profiles to individual capabilities they include

## Usage

```typescript
db.orgProfileCapability.findMany({ select: { id: true } }).execute()
db.orgProfileCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgProfileCapability.create({ data: { capabilityId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileCapability.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.orgProfileCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgProfileCapability records

```typescript
const items = await db.orgProfileCapability.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a orgProfileCapability

```typescript
const item = await db.orgProfileCapability.create({
  data: { capabilityId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
