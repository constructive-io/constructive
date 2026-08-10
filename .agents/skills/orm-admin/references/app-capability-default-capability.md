# appCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking capability defaults to individual capabilities; recompute trigger rebuilds the defaults bitmask

## Usage

```typescript
db.appCapabilityDefaultCapability.findMany({ select: { id: true } }).execute()
db.appCapabilityDefaultCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appCapabilityDefaultCapability.create({ data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.appCapabilityDefaultCapability.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.appCapabilityDefaultCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appCapabilityDefaultCapability records

```typescript
const items = await db.appCapabilityDefaultCapability.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a appCapabilityDefaultCapability

```typescript
const item = await db.appCapabilityDefaultCapability.create({
  data: { capabilityId: '<UUID>' },
  select: { id: true }
}).execute();
```
