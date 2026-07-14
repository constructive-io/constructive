# schema

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Schema records

## Usage

```typescript
db.schema.findMany({ select: { id: true } }).execute()
db.schema.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.schema.create({ data: { apiExposure: '<ApiExposureLevel>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', isPublic: '<Boolean>', label: '<String>', name: '<String>', schemaName: '<String>', smartTags: '<JSON>', tags: '<String>' }, select: { id: true } }).execute()
db.schema.update({ where: { id: '<UUID>' }, data: { apiExposure: '<ApiExposureLevel>' }, select: { id: true } }).execute()
db.schema.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all schema records

```typescript
const items = await db.schema.findMany({
  select: { id: true, apiExposure: true }
}).execute();
```

### Create a schema

```typescript
const item = await db.schema.create({
  data: { apiExposure: '<ApiExposureLevel>', category: '<ObjectCategory>', databaseId: '<UUID>', description: '<String>', isPublic: '<Boolean>', label: '<String>', name: '<String>', schemaName: '<String>', smartTags: '<JSON>', tags: '<String>' },
  select: { id: true }
}).execute();
```
