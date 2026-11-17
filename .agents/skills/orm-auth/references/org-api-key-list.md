# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgApiKeyList records

## Usage

```typescript
db.orgApiKeyList.findMany({ select: { id: true } }).execute()
db.orgApiKeyList.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgApiKeyList.update({ where: { id: '<UUID>' }, data: { accessLevel: '<String>' }, select: { id: true } }).execute()
db.orgApiKeyList.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgApiKeyList records

```typescript
const items = await db.orgApiKeyList.findMany({
  select: { id: true, accessLevel: true }
}).execute();
```
