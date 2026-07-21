# dbPoolConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases.

## Usage

```typescript
db.dbPoolConfig.findMany({ select: { id: true } }).execute()
db.dbPoolConfig.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPoolConfig.create({ data: { domain: '<String>', enabled: '<Boolean>', max: '<Int>', min: '<Int>', poolOwnerId: '<UUID>', presetSlug: '<String>', warmTtl: '<Interval>' }, select: { id: true } }).execute()
db.dbPoolConfig.update({ where: { id: '<UUID>' }, data: { domain: '<String>' }, select: { id: true } }).execute()
db.dbPoolConfig.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPoolConfig records

```typescript
const items = await db.dbPoolConfig.findMany({
  select: { id: true, domain: true }
}).execute();
```

### Create a dbPoolConfig

```typescript
const item = await db.dbPoolConfig.create({
  data: { domain: '<String>', enabled: '<Boolean>', max: '<Int>', min: '<Int>', poolOwnerId: '<UUID>', presetSlug: '<String>', warmTtl: '<Interval>' },
  select: { id: true }
}).execute();
```
