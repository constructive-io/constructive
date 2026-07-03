# orgApiKeyList

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for OrgApiKeyList records

## Usage

```typescript
db.orgApiKeyList.findMany({ select: { id: true } }).execute()
db.orgApiKeyList.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.orgApiKeyList.create({ data: { keyId: '<String>', name: '<String>', principalId: '<UUID>', orgId: '<UUID>', expiresAt: '<Datetime>', revokedAt: '<Datetime>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', accessLevel: '<String>' }, select: { id: true } }).execute()
db.orgApiKeyList.update({ where: { id: '<UUID>' }, data: { keyId: '<String>' }, select: { id: true } }).execute()
db.orgApiKeyList.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all orgApiKeyList records

```typescript
const items = await db.orgApiKeyList.findMany({
  select: { id: true, keyId: true }
}).execute();
```

### Create a orgApiKeyList

```typescript
const item = await db.orgApiKeyList.create({
  data: { keyId: '<String>', name: '<String>', principalId: '<UUID>', orgId: '<UUID>', expiresAt: '<Datetime>', revokedAt: '<Datetime>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', accessLevel: '<String>' },
  select: { id: true }
}).execute();
```
