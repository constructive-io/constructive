# orgCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from the defaults bitmask

## Usage

```typescript
db.orgCapabilityDefaultGrant.findMany({ select: { id: true } }).execute()
db.orgCapabilityDefaultGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgCapabilityDefaultGrant.create({ data: { capabilityId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.orgCapabilityDefaultGrant.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.orgCapabilityDefaultGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgCapabilityDefaultGrant records

```typescript
const items = await db.orgCapabilityDefaultGrant.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a orgCapabilityDefaultGrant

```typescript
const item = await db.orgCapabilityDefaultGrant.create({
  data: { capabilityId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
