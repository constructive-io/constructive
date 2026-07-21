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
db.agentResource.create({ data: { archivedAt: '<Datetime>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', kindTrgmSimilarity: '<Float>', metadata: '<JSON>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>' }, select: { id: true } }).execute()
db.agentResource.update({ where: { id: '<UUID>' }, data: { archivedAt: '<Datetime>' }, select: { id: true } }).execute()
db.agentResource.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentResource records

```typescript
const items = await db.agentResource.findMany({
  select: { id: true, archivedAt: true }
}).execute();
```

### Create a agentResource

```typescript
const item = await db.agentResource.create({
  data: { archivedAt: '<Datetime>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', kindTrgmSimilarity: '<Float>', metadata: '<JSON>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>' },
  select: { id: true }
}).execute();
```
