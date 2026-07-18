# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NodeTypeRegistry records

## Usage

```typescript
db.nodeTypeRegistry.findMany({ select: { id: true } }).execute()
db.nodeTypeRegistry.findOne({ name: '<String>', select: { id: true } }).execute()
db.nodeTypeRegistry.create({ data: { category: '<String>', description: '<String>', displayName: '<String>', parameterSchema: '<JSON>', slug: '<String>', tags: '<String>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.update({ where: { name: '<String>' }, data: { category: '<String>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.delete({ where: { name: '<String>' } }).execute()
```

## Examples

### List all nodeTypeRegistry records

```typescript
const items = await db.nodeTypeRegistry.findMany({
  select: { name: true, category: true }
}).execute();
```

### Create a nodeTypeRegistry

```typescript
const item = await db.nodeTypeRegistry.create({
  data: { category: '<String>', description: '<String>', displayName: '<String>', parameterSchema: '<JSON>', slug: '<String>', tags: '<String>' },
  select: { name: true }
}).execute();
```
