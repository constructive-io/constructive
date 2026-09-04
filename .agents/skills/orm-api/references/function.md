# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for Function records

## Usage

```typescript
db.function.findMany({ select: { id: true } }).execute()
db.function.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.function.create({ data: { apiExposed: '<Boolean>', arguments: '<JSON>', bodyAst: '<JSON>', category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', functionType: '<String>', isStrict: '<Boolean>', kind: '<String>', name: '<String>', returns: '<JSON>', schemaId: '<UUID>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tags: '<String>', volatility: '<String>' }, select: { id: true } }).execute()
db.function.update({ where: { id: '<UUID>' }, data: { apiExposed: '<Boolean>' }, select: { id: true } }).execute()
db.function.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all function records

```typescript
const items = await db.function.findMany({
  select: { id: true, apiExposed: true }
}).execute();
```

### Create a function

```typescript
const item = await db.function.create({
  data: { apiExposed: '<Boolean>', arguments: '<JSON>', bodyAst: '<JSON>', category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', functionType: '<String>', isStrict: '<Boolean>', kind: '<String>', name: '<String>', returns: '<JSON>', schemaId: '<UUID>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tags: '<String>', volatility: '<String>' },
  select: { id: true }
}).execute();
```
