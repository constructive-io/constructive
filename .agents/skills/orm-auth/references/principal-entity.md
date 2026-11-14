# principalEntity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Association table scoping principals to specific organizations

## Usage

```typescript
db.principalEntity.findMany({ select: { id: true } }).execute()
db.principalEntity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.principalEntity.update({ where: { id: '<UUID>' }, data: { entityId: '<UUID>' }, select: { id: true } }).execute()
db.principalEntity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all principalEntity records

```typescript
const items = await db.principalEntity.findMany({
  select: { id: true, entityId: true }
}).execute();
```
