# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

An owned, executable blueprint scoped to a specific database. Created by copying from a blueprint_template via copy_template_to_blueprint() or built from scratch. The owner can customize the definition before executing it with construct_blueprint(). Each blueprint tracks its execution status (draft/constructed/failed) and stores the ref_map of created table IDs after construction.

## Usage

```typescript
db.blueprint.findMany({ select: { id: true } }).execute()
db.blueprint.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.blueprint.create({ data: { ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', status: '<String>', constructedAt: '<Datetime>', errorDetails: '<String>', refMap: '<JSON>', constructedDefinition: '<JSON>', definitionHash: '<UUID>', tableHashes: '<JSON>' }, select: { id: true } }).execute()
db.blueprint.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.blueprint.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all blueprint records

```typescript
const items = await db.blueprint.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a blueprint

```typescript
const item = await db.blueprint.create({
  data: { ownerId: '<UUID>', databaseId: '<UUID>', name: '<String>', displayName: '<String>', description: '<String>', definition: '<JSON>', templateId: '<UUID>', status: '<String>', constructedAt: '<Datetime>', errorDetails: '<String>', refMap: '<JSON>', constructedDefinition: '<JSON>', definitionHash: '<UUID>', tableHashes: '<JSON>' },
  select: { id: true }
}).execute();
```
