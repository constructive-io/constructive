# resourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ResourceDeclaredCapacity records

## Usage

```typescript
db.resourceDeclaredCapacity.findMany({ select: { id: true } }).execute()
db.resourceDeclaredCapacity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.resourceDeclaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute()
db.resourceDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.resourceDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all resourceDeclaredCapacity records

```typescript
const items = await db.resourceDeclaredCapacity.findMany({
  select: { id: true, cpuLimitMillicores: true }
}).execute();
```

### Create a resourceDeclaredCapacity

```typescript
const item = await db.resourceDeclaredCapacity.create({
  data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' },
  select: { id: true }
}).execute();
```
