# platformProposalComment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Comments on a local proposal, optionally anchored to a line

## Usage

```typescript
usePlatformProposalCommentsQuery({ selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformProposalCommentQuery({ id: '<UUID>', selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformProposalCommentMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalCommentMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalCommentMutation({})
```

## Examples

### List all platformProposalComments

```typescript
const { data, isLoading } = usePlatformProposalCommentsQuery({
  selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformProposalComment

```typescript
const { mutate } = useCreatePlatformProposalCommentMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', attachments: '<Upload>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', line: '<Int>', outdatedAt: '<Datetime>', path: '<String>', pathTrgmSimilarity: '<Float>', proposalId: '<UUID>', resolvedAt: '<Datetime>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
