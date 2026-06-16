# rateLimitMetersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RateLimitMetersModule records

## Usage

```typescript
db.rateLimitMetersModule.findMany({ select: { id: true } }).execute()
db.rateLimitMetersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.rateLimitMetersModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.rateLimitMetersModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.rateLimitMetersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all rateLimitMetersModule records

```typescript
const items = await db.rateLimitMetersModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a rateLimitMetersModule

```typescript
const item = await db.rateLimitMetersModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', checkRateLimitFunction: '<String>', prefix: '<String>', defaultPermissions: '<String>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
