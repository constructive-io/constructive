# orgCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking capability defaults to individual capabilities; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
db.orgCapabilityDefaultCapability.findMany({ select: { id: true } }).execute()
db.orgCapabilityDefaultCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgCapabilityDefaultCapability.create({ data: { capabilityId: '<UUID>', entityId: '<UUID>' }, select: { id: true } }).execute()
db.orgCapabilityDefaultCapability.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.orgCapabilityDefaultCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgCapabilityDefaultCapability records

```typescript
const items = await db.orgCapabilityDefaultCapability.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a orgCapabilityDefaultCapability

```typescript
const item = await db.orgCapabilityDefaultCapability.create({
  data: { capabilityId: '<UUID>', entityId: '<UUID>' },
  select: { id: true }
}).execute();
```
