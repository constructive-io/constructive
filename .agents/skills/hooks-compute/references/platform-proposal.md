# platformProposal

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Proposals against a repository: issues, changes to merge, discussions and decisions

## Usage

```typescript
usePlatformProposalsQuery({ selection: { fields: { actorId: true, body: true, bodyTrgmSimilarity: true, closedReason: true, closedReasonTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, decidedAt: true, dueAt: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, kind: true, kindTrgmSimilarity: true, labels: true, mergeCommit: true, mergeCommitTrgmSimilarity: true, mergeMethod: true, mergeMethodTrgmSimilarity: true, mergeRequestedAt: true, mergedAt: true, metadata: true, parentId: true, priority: true, repositoryId: true, resolution: true, resolutionTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, sourceRef: true, sourceRefTrgmSimilarity: true, status: true, statusTrgmSimilarity: true, targetRef: true, targetRefTrgmSimilarity: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformProposalQuery({ id: '<UUID>', selection: { fields: { actorId: true, body: true, bodyTrgmSimilarity: true, closedReason: true, closedReasonTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, decidedAt: true, dueAt: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, kind: true, kindTrgmSimilarity: true, labels: true, mergeCommit: true, mergeCommitTrgmSimilarity: true, mergeMethod: true, mergeMethodTrgmSimilarity: true, mergeRequestedAt: true, mergedAt: true, metadata: true, parentId: true, priority: true, repositoryId: true, resolution: true, resolutionTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, sourceRef: true, sourceRefTrgmSimilarity: true, status: true, statusTrgmSimilarity: true, targetRef: true, targetRefTrgmSimilarity: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformProposalMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalMutation({})
```

## Examples

### List all platformProposals

```typescript
const { data, isLoading } = usePlatformProposalsQuery({
  selection: { fields: { actorId: true, body: true, bodyTrgmSimilarity: true, closedReason: true, closedReasonTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, decidedAt: true, dueAt: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, kind: true, kindTrgmSimilarity: true, labels: true, mergeCommit: true, mergeCommitTrgmSimilarity: true, mergeMethod: true, mergeMethodTrgmSimilarity: true, mergeRequestedAt: true, mergedAt: true, metadata: true, parentId: true, priority: true, repositoryId: true, resolution: true, resolutionTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, sourceRef: true, sourceRefTrgmSimilarity: true, status: true, statusTrgmSimilarity: true, targetRef: true, targetRefTrgmSimilarity: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformProposal

```typescript
const { mutate } = useCreatePlatformProposalMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', body: '<String>', bodyTrgmSimilarity: '<Float>', closedReason: '<String>', closedReasonTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', decidedAt: '<Datetime>', dueAt: '<Datetime>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', kind: '<String>', kindTrgmSimilarity: '<Float>', labels: '<String>', mergeCommit: '<String>', mergeCommitTrgmSimilarity: '<Float>', mergeMethod: '<String>', mergeMethodTrgmSimilarity: '<Float>', mergeRequestedAt: '<Datetime>', mergedAt: '<Datetime>', metadata: '<JSON>', parentId: '<UUID>', priority: '<BigFloat>', repositoryId: '<UUID>', resolution: '<String>', resolutionTrgmSimilarity: '<Float>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', sourceRef: '<String>', sourceRefTrgmSimilarity: '<Float>', status: '<String>', statusTrgmSimilarity: '<Float>', targetRef: '<String>', targetRefTrgmSimilarity: '<Float>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
