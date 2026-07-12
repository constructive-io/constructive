# agentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified skills and knowledge resources for agent retrieval

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.agentResource.findMany({ select: { id: true } }).execute()
db.agentResource.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentResource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', kind: '<String>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', isArchived: '<Boolean>', archivedAt: '<Datetime>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', kindTrgmSimilarity: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.agentResource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.agentResource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentResource records

```typescript
const items = await db.agentResource.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a agentResource

```typescript
const item = await db.agentResource.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', kind: '<String>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', isArchived: '<Boolean>', archivedAt: '<Datetime>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', kindTrgmSimilarity: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
