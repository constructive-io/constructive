# orgLimitCapsDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers.

## Usage

```typescript
db.orgLimitCapsDefault.findMany({ select: { id: true } }).execute()
db.orgLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgLimitCapsDefault.create({ data: { max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute()
db.orgLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute()
db.orgLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgLimitCapsDefault records

```typescript
const items = await db.orgLimitCapsDefault.findMany({
  select: { id: true, max: true }
}).execute();
```

### Create a orgLimitCapsDefault

```typescript
const item = await db.orgLimitCapsDefault.create({
  data: { max: '<BigInt>', name: '<String>' },
  select: { id: true }
}).execute();
```
