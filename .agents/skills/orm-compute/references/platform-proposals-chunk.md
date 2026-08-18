# platformProposalsChunk

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for PlatformProposalsChunk records

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

## Usage

```typescript
db.platformProposalsChunk.findMany({ select: { id: true } }).execute()
db.platformProposalsChunk.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposalsChunk.create({ data: { actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformProposalsId: '<UUID>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.platformProposalsChunk.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformProposalsChunk.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposalsChunk records

```typescript
const items = await db.platformProposalsChunk.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformProposalsChunk

```typescript
const item = await db.platformProposalsChunk.create({
  data: { actorId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', platformProposalsId: '<UUID>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
