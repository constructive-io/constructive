# platformResourceDeclaredCapacity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformResourceDeclaredCapacity records

## Usage

```typescript
db.platformResourceDeclaredCapacity.findMany({ select: { id: true } }).execute()
db.platformResourceDeclaredCapacity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformResourceDeclaredCapacity.create({ data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceDeclaredCapacity.update({ where: { id: '<UUID>' }, data: { cpuLimitMillicores: '<BigInt>' }, select: { id: true } }).execute()
db.platformResourceDeclaredCapacity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformResourceDeclaredCapacity records

```typescript
const items = await db.platformResourceDeclaredCapacity.findMany({
  select: { id: true, cpuLimitMillicores: true }
}).execute();
```

### Create a platformResourceDeclaredCapacity

```typescript
const item = await db.platformResourceDeclaredCapacity.create({
  data: { cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' },
  select: { id: true }
}).execute();
```
