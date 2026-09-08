# platformProposalComment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Comments on a local proposal, optionally anchored to a line

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.platformProposalComment.findMany({ select: { id: true } }).execute()
db.platformProposalComment.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposalComment.create({ data: { actorId: '<UUID>', attachments: '<Upload>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', line: '<Int>', outdatedAt: '<Datetime>', path: '<String>', pathTrgmSimilarity: '<Float>', proposalId: '<UUID>', resolvedAt: '<Datetime>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformProposalComment.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformProposalComment.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposalComment records

```typescript
const items = await db.platformProposalComment.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformProposalComment

```typescript
const item = await db.platformProposalComment.create({
  data: { actorId: '<UUID>', attachments: '<Upload>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', line: '<Int>', outdatedAt: '<Datetime>', path: '<String>', pathTrgmSimilarity: '<Float>', proposalId: '<UUID>', resolvedAt: '<Datetime>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
