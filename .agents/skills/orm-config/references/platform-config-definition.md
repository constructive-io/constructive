# platformConfigDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Registry of valid config keys — declares which config entries the platform recognizes

## Usage

```typescript
db.platformConfigDefinition.findMany({ select: { id: true } }).execute()
db.platformConfigDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformConfigDefinition.create({ data: { name: '<String>', description: '<String>', defaultValue: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformConfigDefinition.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.platformConfigDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformConfigDefinition records

```typescript
const items = await db.platformConfigDefinition.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a platformConfigDefinition

```typescript
const item = await db.platformConfigDefinition.create({
  data: { name: '<String>', description: '<String>', defaultValue: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>' },
  select: { id: true }
}).execute();
```
