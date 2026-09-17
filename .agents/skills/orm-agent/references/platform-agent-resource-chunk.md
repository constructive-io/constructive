# platformAgentResourceChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformAgentResourceChunk records

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

## Usage

```typescript
db.platformAgentResourceChunk.findMany({ select: { id: true } }).execute()
db.platformAgentResourceChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformAgentResourceChunk.create({ data: { body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformAgentResourceId: '<UUID>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.platformAgentResourceChunk.update({ where: { id: '<UUID>' }, data: { body: '<String>' }, select: { id: true } }).execute()
db.platformAgentResourceChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformAgentResourceChunk records

```typescript
const items = await db.platformAgentResourceChunk.findMany({
  select: { id: true, body: true }
}).execute();
```

### Create a platformAgentResourceChunk

```typescript
const item = await db.platformAgentResourceChunk.create({
  data: { body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformAgentResourceId: '<UUID>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
