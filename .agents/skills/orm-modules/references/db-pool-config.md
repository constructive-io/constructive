# dbPoolConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases.

## Usage

```typescript
db.dbPoolConfig.findMany({ select: { id: true } }).execute()
db.dbPoolConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPoolConfig.create({ data: { presetSlug: '<String>', domain: '<String>', poolOwnerId: '<UUID>', min: '<Int>', max: '<Int>', warmTtl: '<Interval>', enabled: '<Boolean>' }, select: { id: true } }).execute()
db.dbPoolConfig.update({ where: { id: '<UUID>' }, data: { presetSlug: '<String>' }, select: { id: true } }).execute()
db.dbPoolConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPoolConfig records

```typescript
const items = await db.dbPoolConfig.findMany({
  select: { id: true, presetSlug: true }
}).execute();
```

### Create a dbPoolConfig

```typescript
const item = await db.dbPoolConfig.create({
  data: { presetSlug: '<String>', domain: '<String>', poolOwnerId: '<UUID>', min: '<Int>', max: '<Int>', warmTtl: '<Interval>', enabled: '<Boolean>' },
  select: { id: true }
}).execute();
```
