# domainType

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for DomainType records

## Usage

```typescript
db.domainType.findMany({ select: { id: true } }).execute()
db.domainType.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.domainType.create({ data: { baseType: '<JSON>', category: '<ObjectCategory>', checkExpr: '<JSON>', databaseId: '<UUID>', defaultExpr: '<JSON>', description: '<String>', label: '<String>', name: '<String>', notNull: '<Boolean>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' }, select: { id: true } }).execute()
db.domainType.update({ where: { id: '<UUID>' }, data: { baseType: '<JSON>' }, select: { id: true } }).execute()
db.domainType.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all domainType records

```typescript
const items = await db.domainType.findMany({
  select: { id: true, baseType: true }
}).execute();
```

### Create a domainType

```typescript
const item = await db.domainType.create({
  data: { baseType: '<JSON>', category: '<ObjectCategory>', checkExpr: '<JSON>', databaseId: '<UUID>', defaultExpr: '<JSON>', description: '<String>', label: '<String>', name: '<String>', notNull: '<Boolean>', schemaId: '<UUID>', smartTags: '<JSON>', tags: '<String>' },
  select: { id: true }
}).execute();
```
