# proposalsChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ProposalsChunk records

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

## Usage

```typescript
db.proposalsChunk.findMany({ select: { id: true } }).execute()
db.proposalsChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.proposalsChunk.create({ data: { actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', databaseId: '<UUID>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', proposalsId: '<UUID>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.proposalsChunk.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.proposalsChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all proposalsChunk records

```typescript
const items = await db.proposalsChunk.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a proposalsChunk

```typescript
const item = await db.proposalsChunk.create({
  data: { actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', databaseId: '<UUID>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', proposalsId: '<UUID>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
