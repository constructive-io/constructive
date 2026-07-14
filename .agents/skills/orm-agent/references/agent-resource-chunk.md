# agentResourceChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for AgentResourceChunk records

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

## Usage

```typescript
db.agentResourceChunk.findMany({ select: { id: true } }).execute()
db.agentResourceChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentResourceChunk.create({ data: { agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.agentResourceChunk.update({ where: { id: '<UUID>' }, data: { agentResourceId: '<UUID>' }, select: { id: true } }).execute()
db.agentResourceChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentResourceChunk records

```typescript
const items = await db.agentResourceChunk.findMany({
  select: { id: true, agentResourceId: true }
}).execute();
```

### Create a agentResourceChunk

```typescript
const item = await db.agentResourceChunk.create({
  data: { agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
