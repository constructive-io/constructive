# blueprintTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

A shareable, versioned schema recipe for the blueprint marketplace. Templates define arrays of secure_table_provision + relation_provision inputs that together describe a complete domain schema (e.g. e-commerce, telemedicine, habit tracker). Templates are never executed directly — they are copied into a blueprint first via copy_template_to_blueprint(). Can be private (owner-only) or public (marketplace-visible).

## Usage

```typescript
db.blueprintTemplate.findMany({ select: { id: true } }).execute()
db.blueprintTemplate.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.blueprintTemplate.create({ data: { name: '<String>', version: '<String>', displayName: '<String>', description: '<String>', ownerId: '<UUID>', visibility: '<String>', categories: '<String>', tags: '<String>', definition: '<JSON>', definitionSchemaVersion: '<String>', source: '<String>', complexity: '<String>', copyCount: '<Int>', forkCount: '<Int>', forkedFromId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' }, select: { id: true } }).execute()
db.blueprintTemplate.update({ where: { id: '<UUID>' }, data: { name: '<String>' }, select: { id: true } }).execute()
db.blueprintTemplate.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all blueprintTemplate records

```typescript
const items = await db.blueprintTemplate.findMany({
  select: { id: true, name: true }
}).execute();
```

### Create a blueprintTemplate

```typescript
const item = await db.blueprintTemplate.create({
  data: { name: '<String>', version: '<String>', displayName: '<String>', description: '<String>', ownerId: '<UUID>', visibility: '<String>', categories: '<String>', tags: '<String>', definition: '<JSON>', definitionSchemaVersion: '<String>', source: '<String>', complexity: '<String>', copyCount: '<Int>', forkCount: '<Int>', forkedFromId: '<UUID>', definitionHash: '<UUID>', tableHashes: '<JSON>' },
  select: { id: true }
}).execute();
```
