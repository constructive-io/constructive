# dbPreset

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Database provisioning preset catalog — merkle-versioned head over the infra store

## Usage

```typescript
db.dbPreset.findMany({ select: { id: true } }).execute()
db.dbPreset.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.dbPreset.create({ data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' }, select: { id: true } }).execute()
db.dbPreset.update({ where: { id: '<UUID>' }, data: { active: '<Boolean>' }, select: { id: true } }).execute()
db.dbPreset.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all dbPreset records

```typescript
const items = await db.dbPreset.findMany({
  select: { id: true, active: true }
}).execute();
```

### Create a dbPreset

```typescript
const item = await db.dbPreset.create({
  data: { active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' },
  select: { id: true }
}).execute();
```
