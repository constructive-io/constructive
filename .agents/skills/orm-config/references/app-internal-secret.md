# appInternalSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AppInternalSecret records

## Usage

```typescript
db.appInternalSecret.findMany({ select: { id: true } }).execute()
db.appInternalSecret.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appInternalSecret.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.appInternalSecret.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appInternalSecret records

```typescript
const items = await db.appInternalSecret.findMany({
  select: { id: true, annotations: true }
}).execute();
```
