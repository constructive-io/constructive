# rateLimitMetersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RateLimitMetersModule records

## Usage

```typescript
db.rateLimitMetersModule.findMany({ select: { id: true } }).execute()
db.rateLimitMetersModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.rateLimitMetersModule.create({ data: { apiName: '<String>', checkRateLimitFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', schemaId: '<UUID>' }, select: { id: true } }).execute()
db.rateLimitMetersModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.rateLimitMetersModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all rateLimitMetersModule records

```typescript
const items = await db.rateLimitMetersModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a rateLimitMetersModule

```typescript
const item = await db.rateLimitMetersModule.create({
  data: { apiName: '<String>', checkRateLimitFunction: '<String>', databaseId: '<UUID>', defaultPermissions: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', rateLimitOverridesTableId: '<UUID>', rateLimitOverridesTableName: '<String>', rateLimitStateTableId: '<UUID>', rateLimitStateTableName: '<String>', rateWindowLimitsTableId: '<UUID>', rateWindowLimitsTableName: '<String>', schemaId: '<UUID>' },
  select: { id: true }
}).execute();
```
