# roleType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RoleType records

## Usage

```typescript
db.roleType.findMany({ select: { id: true } }).execute()
db.roleType.findOne({ id: '<Int>', select: { id: true } }).execute()
db.roleType.create({ data: { name: '<String>' }, select: { id: true } }).execute()
db.roleType.update({ where: { id: '<Int>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.roleType.delete({ where: { id: '<Int>' } }).execute()
```

## Examples

### List all roleType records

```typescript
const items = await db.roleType.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a roleType

```typescript
const item = await db.roleType.create({
  data: { name: '<String>' },
  select: { id: true }
}).execute();
```
