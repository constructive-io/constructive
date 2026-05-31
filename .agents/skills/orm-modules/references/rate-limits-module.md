# rateLimitsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RateLimitsModule records

## Usage

```typescript
db.rateLimitsModule.findMany({ select: { id: true } }).execute()
db.rateLimitsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.rateLimitsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', rateLimitSettingsTableId: '<UUID>', ipRateLimitsTableId: '<UUID>', rateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', ipRateLimitsTable: '<String>', rateLimitsTable: '<String>' }, select: { id: true } }).execute()
db.rateLimitsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.rateLimitsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all rateLimitsModule records

```typescript
const items = await db.rateLimitsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a rateLimitsModule

```typescript
const item = await db.rateLimitsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', rateLimitSettingsTableId: '<UUID>', ipRateLimitsTableId: '<UUID>', rateLimitsTableId: '<UUID>', rateLimitSettingsTable: '<String>', ipRateLimitsTable: '<String>', rateLimitsTable: '<String>' },
  select: { id: true }
}).execute();
```
