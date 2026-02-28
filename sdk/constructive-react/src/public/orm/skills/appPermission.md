# orm-appPermission

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppPermission records

## Usage

```typescript
db.appPermission.findMany({ select: { id: true } }).execute()
db.appPermission.findOne({ id: '<value>', select: { id: true } }).execute()
db.appPermission.create({ data: { name: '<value>', bitnum: '<value>', bitstr: '<value>', description: '<value>' }, select: { id: true } }).execute()
db.appPermission.update({ where: { id: '<value>' }, data: { name: '<new>' }, select: { id: true } }).execute()
db.appPermission.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all appPermission records

```typescript
const items = await db.appPermission.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a appPermission

```typescript
const item = await db.appPermission.create({
  data: { name: 'value', bitnum: 'value', bitstr: 'value', description: 'value' },
  select: { id: true }
}).execute();
```
