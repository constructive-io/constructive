# platformProposalReview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Review verdicts on a proposal, each pinned to the commit reviewed

## Usage

```typescript
usePlatformProposalReviewsQuery({ selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } } })
usePlatformProposalReviewQuery({ id: '<UUID>', selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } } })
useCreatePlatformProposalReviewMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalReviewMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalReviewMutation({})
```

## Examples

### List all platformProposalReviews

```typescript
const { data, isLoading } = usePlatformProposalReviewsQuery({
  selection: { fields: { body: true, bodyTrgmSimilarity: true, commitSha: true, commitShaTrgmSimilarity: true, createdAt: true, createdByPrincipal: true, id: true, proposalId: true, reviewerId: true, search: true, searchScore: true, searchTsvRank: true, submittedAt: true, updatedAt: true, updatedByPrincipal: true, verdict: true, verdictTrgmSimilarity: true } },
});
```

### Create a platformProposalReview

```typescript
const { mutate } = useCreatePlatformProposalReviewMutation({
  selection: { fields: { id: true } },
});
mutate({ body: '<String>', bodyTrgmSimilarity: '<Float>', commitSha: '<String>', commitShaTrgmSimilarity: '<Float>', createdByPrincipal: '<UUID>', proposalId: '<UUID>', reviewerId: '<UUID>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', submittedAt: '<Datetime>', updatedByPrincipal: '<UUID>', verdict: '<String>', verdictTrgmSimilarity: '<Float>' });
```
