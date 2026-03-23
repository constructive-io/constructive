# appLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Default maximum values for each named limit, applied when no per-actor override exists

## Usage

```typescript
db.appLimitDefault.findMany({ select: { id: true } }).execute()
db.appLimitDefault.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appLimitDefault.create({ data: { name: '<String>', max: '<Int>' }, select: { id: true } }).execute()
db.appLimitDefault.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.appLimitDefault.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appLimitDefault records

```typescript
const items = await db.appLimitDefault.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appLimitDefault

```typescript
const item = await db.appLimitDefault.create({
  data: { name: '<String>', max: '<Int>' },
  select: { id: true }
}).execute();
```
