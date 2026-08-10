# appProfileCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table linking profiles to individual capabilities they include

## Usage

```typescript
db.appProfileCapability.findMany({ select: { id: true } }).execute()
db.appProfileCapability.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appProfileCapability.create({ data: { capabilityId: '<UUID>', profileId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileCapability.update({ where: { id: '<UUID>' }, data: { capabilityId: '<UUID>' }, select: { id: true } }).execute()
db.appProfileCapability.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appProfileCapability records

```typescript
const items = await db.appProfileCapability.findMany({
  select: { id: true, capabilityId: true }
}).execute();
```

### Create a appProfileCapability

```typescript
const item = await db.appProfileCapability.create({
  data: { capabilityId: '<UUID>', profileId: '<UUID>' },
  select: { id: true }
}).execute();
```
