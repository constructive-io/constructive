# proposalReview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Review verdicts on a proposal, each pinned to the commit reviewed

## Usage

```typescript
useProposalReviewsQuery({ selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } } })
useProposalReviewQuery({ id: '<UUID>', selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } } })
useCreateProposalReviewMutation({ selection: { fields: { id: true } } })
useUpdateProposalReviewMutation({ selection: { fields: { id: true } } })
useDeleteProposalReviewMutation({})
```

## Examples

### List all proposalReviews

```typescript
const { data, isLoading } = useProposalReviewsQuery({
  selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } },
});
```

### Create a proposalReview

```typescript
const { mutate } = useCreateProposalReviewMutation({
  selection: { fields: { id: true } },
});
mutate({ body: '<String>', bodyTrgmSimilarity: '<Float>', commitSha: '<String>', commitShaTrgmSimilarity: '<Float>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', proposalId: '<UUID>', reviewerId: '<UUID>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', submittedAt: '<Datetime>', updatedByPrincipal: '<UUID>', verdict: '<String>', verdictTrgmSimilarity: '<Float>' });
```
