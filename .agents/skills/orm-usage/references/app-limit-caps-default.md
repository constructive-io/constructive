# appLimitCapsDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers.

## Usage

```typescript
db.appLimitCapsDefault.findMany({ select: { id: true } }).execute()
db.appLimitCapsDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitCapsDefault.create({ data: { max: '<BigInt>', name: '<String>' }, select: { id: true } }).execute()
db.appLimitCapsDefault.update({ where: { id: '<UUID>' }, data: { max: '<BigInt>' }, select: { id: true } }).execute()
db.appLimitCapsDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitCapsDefault records

```typescript
const items = await db.appLimitCapsDefault.findMany({
  select: { id: true, max: true }
}).execute();
```

### Create a appLimitCapsDefault

```typescript
const item = await db.appLimitCapsDefault.create({
  data: { max: '<BigInt>', name: '<String>' },
  select: { id: true }
}).execute();
```
