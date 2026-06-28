# principalEntity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Association table scoping principals to specific organizations

## Usage

```typescript
db.principalEntity.findMany({ select: { id: true } }).execute()
db.principalEntity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalEntity.create({ data: { principalId: '<UUID>', entityId: '<UUID>', ownerId: '<UUID>' }, select: { id: true } }).execute()
db.principalEntity.update({ where: { id: '<UUID>' }, data: { principalId: '<UUID>' }, select: { id: true } }).execute()
db.principalEntity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalEntity records

```typescript
const items = await db.principalEntity.findMany({
  select: { id: true, principalId: true }
}).execute();
```

### Create a principalEntity

```typescript
const item = await db.principalEntity.create({
  data: { principalId: '<UUID>', entityId: '<UUID>', ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
