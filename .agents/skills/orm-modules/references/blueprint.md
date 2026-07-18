# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An owned, editable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition at any time. Execute it with construct_blueprint() which creates a separate blueprint_construction record to track the build.

## Usage

```typescript
db.blueprint.findMany({ select: { id: true } }).execute()
db.blueprint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.blueprint.create({ data: { databaseId: '<UUID>', definition: '<JSON>', definitionHash: '<UUID>', description: '<String>', displayName: '<String>', name: '<String>', ownerId: '<UUID>', tableHashes: '<JSON>', templateId: '<UUID>' }, select: { id: true } }).execute()
db.blueprint.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.blueprint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all blueprint records

```typescript
const items = await db.blueprint.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a blueprint

```typescript
const item = await db.blueprint.create({
  data: { databaseId: '<UUID>', definition: '<JSON>', definitionHash: '<UUID>', description: '<String>', displayName: '<String>', name: '<String>', ownerId: '<UUID>', tableHashes: '<JSON>', templateId: '<UUID>' },
  select: { id: true }
}).execute();
```
