# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgApiKeyList records

## Usage

```typescript
db.orgApiKeyList.findMany({ select: { id: true } }).execute()
db.orgApiKeyList.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgApiKeyList.create({ data: { accessLevel: '<String>', expiresAt: '<Datetime>', keyId: '<String>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', name: '<String>', orgId: '<UUID>', principalId: '<UUID>', revokedAt: '<Datetime>' }, select: { id: true } }).execute()
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

### Create a orgApiKeyList

```typescript
const item = await db.orgApiKeyList.create({
  data: { accessLevel: '<String>', expiresAt: '<Datetime>', keyId: '<String>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', name: '<String>', orgId: '<UUID>', principalId: '<UUID>', revokedAt: '<Datetime>' },
  select: { id: true }
}).execute();
```
