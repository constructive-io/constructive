# orm-appLimitDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppLimitDefault records

## Usage

```typescript
db.appLimitDefault.findMany({ select: { id: true } }).execute()
db.appLimitDefault.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.appLimitDefault.create({ data: { name: '<value>', max: '<value>' }, select: { id: true } }).execute()
db.appLimitDefault.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.appLimitDefault.delete({ where: { id: '<value>' } }).execute()
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
  data: { name: 'value', max: 'value' },
  select: { id: true }
}).execute();
```
