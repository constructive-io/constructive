# agentSkill

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Structured procedural instructions for agent workflows

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.agentSkill.findMany({ select: { id: true } }).execute()
db.agentSkill.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.agentSkill.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute()
db.agentSkill.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute()
db.agentSkill.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all agentSkill records

```typescript
const items = await db.agentSkill.findMany({
  select: { id: true, createdBy: true }
}).execute();
```

### Create a agentSkill

```typescript
const item = await db.agentSkill.create({
  data: { createdBy: '<UUID>', updatedBy: '<UUID>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' },
  select: { id: true }
}).execute();
```
