# secretDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets.

## Usage

```typescript
db.secretDefinition.findMany({ select: { id: true } }).execute()
db.secretDefinition.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.secretDefinition.create({ data: { name: '<String>', description: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.secretDefinition.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.secretDefinition.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all secretDefinition records

```typescript
const items = await db.secretDefinition.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a secretDefinition

```typescript
const item = await db.secretDefinition.create({
  data: { name: '<String>', description: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
