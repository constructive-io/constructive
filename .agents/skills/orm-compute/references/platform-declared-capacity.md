# platformDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformDeclaredCapacity records

## Usage

```typescript
db.platformDeclaredCapacity.findMany({ select: { id: true } }).execute()
db.platformDeclaredCapacity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformDeclaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.platformDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformDeclaredCapacity records

```typescript
const items = await db.platformDeclaredCapacity.findMany({
  select: { id: true, cpuLimitMillicores: true }
}).execute();
```

### Create a platformDeclaredCapacity

```typescript
const item = await db.platformDeclaredCapacity.create({
  data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' },
  select: { id: true }
}).execute();
```
