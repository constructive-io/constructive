# platformProposal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Proposals against a repository: issues, changes to merge, discussions and decisions

**pgvector embedding fields:** `embedding`
High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.platformProposal.findMany({ select: { id: true } }).execute()
db.platformProposal.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposal.create({ data: { actorId: '<UUID>', body: '<String>', closedReason: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', decidedAt: '<Datetime>', dueAt: '<Datetime>', embedding: '<Vector>', kind: '<String>', labels: '<String>', mergeCommit: '<String>', mergeMethod: '<String>', mergeRequestedAt: '<Datetime>', mergedAt: '<Datetime>', metadata: '<JSON>', parentId: '<UUID>', priority: '<BigFloat>', repositoryId: '<UUID>', resolution: '<String>', sourceRef: '<String>', status: '<String>', targetRef: '<String>', title: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' }, select: { id: true } }).execute()
db.platformProposal.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute()
db.platformProposal.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposal records

```typescript
const items = await db.platformProposal.findMany({
  select: { id: true, actorId: true }
}).execute();
```

### Create a platformProposal

```typescript
const item = await db.platformProposal.create({
  data: { actorId: '<UUID>', body: '<String>', closedReason: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', decidedAt: '<Datetime>', dueAt: '<Datetime>', embedding: '<Vector>', kind: '<String>', labels: '<String>', mergeCommit: '<String>', mergeMethod: '<String>', mergeRequestedAt: '<Datetime>', mergedAt: '<Datetime>', metadata: '<JSON>', parentId: '<UUID>', priority: '<BigFloat>', repositoryId: '<UUID>', resolution: '<String>', sourceRef: '<String>', status: '<String>', targetRef: '<String>', title: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' },
  select: { id: true }
}).execute();
```
