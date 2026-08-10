# appCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Audit log of capability additions and removals from the defaults bitmask

## Usage

```typescript
db.appCapabilityDefaultGrant.findMany({ select: { id: true } }).execute()
db.appCapabilityDefaultGrant.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appCapabilityDefaultGrant.create({ data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' }, select: { id: true } }).execute()
db.appCapabilityDefaultGrant.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.appCapabilityDefaultGrant.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appCapabilityDefaultGrant records

```typescript
const items = await db.appCapabilityDefaultGrant.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a appCapabilityDefaultGrant

```typescript
const item = await db.appCapabilityDefaultGrant.create({
  data: { capabilityId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>' },
  select: { id: true }
}).execute();
```
