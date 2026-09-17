# redirect

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Redirect targets a route can point at; the edge answers with a redirect status instead of a backend

## Usage

```typescript
db.redirect.findMany({ select: { id: true } }).execute()
db.redirect.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.redirect.create({ data: { databaseId: '<UUID>', name: '<String>', preservePath: '<Boolean>', preserveQuery: '<Boolean>', statusCode: '<Int>', toHost: '<String>', toPath: '<String>' }, select: { id: true } }).execute()
db.redirect.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.redirect.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all redirect records

```typescript
const items = await db.redirect.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a redirect

```typescript
const item = await db.redirect.create({
  data: { databaseId: '<UUID>', name: '<String>', preservePath: '<Boolean>', preserveQuery: '<Boolean>', statusCode: '<Int>', toHost: '<String>', toPath: '<String>' },
  select: { id: true }
}).execute();
```
