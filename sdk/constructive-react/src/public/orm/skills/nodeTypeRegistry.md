# orm-nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Registry of high-level semantic AST node types using domain-prefixed naming. These IR nodes compile to multiple targets (Postgres RLS, egress, ingress, etc.).

## Usage

```typescript
db.nodeTypeRegistry.findMany({ select: { id: true } }).execute()
db.nodeTypeRegistry.findOne({ name: '<value>', select: { id: true } }).execute()
db.nodeTypeRegistry.create({ data: { slug: '<value>', category: '<value>', displayName: '<value>', description: '<value>', parameterSchema: '<value>', tags: '<value>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.update({ where: { name: '<value>' }, data: { slug: '<new>' }, select: { id: true } }).execute()
db.nodeTypeRegistry.delete({ where: { name: '<value>' } }).execute()
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
  data: { slug: 'value', category: 'value', displayName: 'value', description: 'value', parameterSchema: 'value', tags: 'value' },
  select: { name: true }
}).execute();
```
