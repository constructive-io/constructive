# platformProposalReview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Review verdicts on a proposal, each pinned to the commit reviewed

**Unified Search API fields:** `search`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```typescript
db.platformProposalReview.findMany({ select: { id: true } }).execute()
db.platformProposalReview.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformProposalReview.create({ data: { body: '<String>', bodyTrgmSimilarity: '<Float>', commitSha: '<String>', commitShaTrgmSimilarity: '<Float>', createdByPrincipal: '<UUID>', proposalId: '<UUID>', reviewerId: '<UUID>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', submittedAt: '<Datetime>', updatedByPrincipal: '<UUID>', verdict: '<String>', verdictTrgmSimilarity: '<Float>' }, select: { id: true } }).execute()
db.platformProposalReview.update({ where: { id: '<UUID>' }, data: { body: '<String>' }, select: { id: true } }).execute()
db.platformProposalReview.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformProposalReview records

```typescript
const items = await db.platformProposalReview.findMany({
  select: { id: true, body: true }
}).execute();
```

### Create a platformProposalReview

```typescript
const item = await db.platformProposalReview.create({
  data: { body: '<String>', bodyTrgmSimilarity: '<Float>', commitSha: '<String>', commitShaTrgmSimilarity: '<Float>', createdByPrincipal: '<UUID>', proposalId: '<UUID>', reviewerId: '<UUID>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', submittedAt: '<Datetime>', updatedByPrincipal: '<UUID>', verdict: '<String>', verdictTrgmSimilarity: '<Float>' },
  select: { id: true }
}).execute();
```
