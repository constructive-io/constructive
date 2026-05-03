# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for NodeTypeRegistry records

## Usage

```typescript
db.nodeTypeRegistry.findMany({ select: { id: true } }).execute()
db.nodeTypeRegistry.findOne({ name: '<String>', select: { id: true } }).execute()
db.nodeTypeRegistry.create({ data: { slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', parameterSchema: '<JSON>', tags: '<String>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.update({ where: { name: '<String>' }, data: { slug: '<String>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.delete({ where: { name: '<String>' } }).execute()
```

## Examples

### List all nodeTypeRegistry records

```typescript
const items = await db.nodeTypeRegistry.findMany({
  select: { name: true, slug: true }
}).execute();
```

### Create a nodeTypeRegistry

```typescript
const item = await db.nodeTypeRegistry.create({
  data: { slug: '<String>', category: '<String>', displayName: '<String>', description: '<String>', parameterSchema: '<JSON>', tags: '<String>' },
  select: { name: true }
}).execute();
```
