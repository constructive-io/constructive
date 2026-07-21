# declaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DeclaredCapacity records

## Usage

```typescript
db.declaredCapacity.findMany({ select: { id: true } }).execute()
db.declaredCapacity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.declaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute()
db.declaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.declaredCapacity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all declaredCapacity records

```typescript
const items = await db.declaredCapacity.findMany({
  select: { id: true, cpuLimitMillicores: true }
}).execute();
```

### Create a declaredCapacity

```typescript
const item = await db.declaredCapacity.create({
  data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' },
  select: { id: true }
}).execute();
```
