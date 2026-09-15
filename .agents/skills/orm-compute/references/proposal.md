# proposal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Proposals against a repository: issues, changes to merge, discussions and decisions

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.proposal.findMany({ select: { id: true } }).execute()
db.proposal.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.proposal.create({ data: { actorId: '<UUID>', body: '<String>', bodyTrgmSimilarity: '<Float>', closedReason: '<String>', closedReasonTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', decidedAt: '<Datetime>', dueAt: '<Datetime>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', kind: '<String>', kindTrgmSimilarity: '<Float>', labels: '<String>', mergeCommit: '<String>', mergeCommitTrgmSimilarity: '<Float>', mergeMethod: '<String>', mergeMethodTrgmSimilarity: '<Float>', mergeRequestedAt: '<Datetime>', mergedAt: '<Datetime>', metadata: '<JSON>', parentId: '<UUID>', priority: '<BigFloat>', repositoryId: '<UUID>', resolution: '<String>', resolutionTrgmSimilarity: '<Float>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', sourceRef: '<String>', sourceRefTrgmSimilarity: '<Float>', status: '<String>', statusTrgmSimilarity: '<Float>', targetRef: '<String>', targetRefTrgmSimilarity: '<Float>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.proposal.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.proposal.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all proposal records

```typescript
const items = await db.proposal.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a proposal

```typescript
const item = await db.proposal.create({
  data: { actorId: '<UUID>', body: '<String>', bodyTrgmSimilarity: '<Float>', closedReason: '<String>', closedReasonTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', decidedAt: '<Datetime>', dueAt: '<Datetime>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', kind: '<String>', kindTrgmSimilarity: '<Float>', labels: '<String>', mergeCommit: '<String>', mergeCommitTrgmSimilarity: '<Float>', mergeMethod: '<String>', mergeMethodTrgmSimilarity: '<Float>', mergeRequestedAt: '<Datetime>', mergedAt: '<Datetime>', metadata: '<JSON>', parentId: '<UUID>', priority: '<BigFloat>', repositoryId: '<UUID>', resolution: '<String>', resolutionTrgmSimilarity: '<Float>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', sourceRef: '<String>', sourceRefTrgmSimilarity: '<Float>', status: '<String>', statusTrgmSimilarity: '<Float>', targetRef: '<String>', targetRefTrgmSimilarity: '<Float>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
