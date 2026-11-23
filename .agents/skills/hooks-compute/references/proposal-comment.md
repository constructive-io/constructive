# proposalComment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Comments on a local proposal, optionally anchored to a line

## Usage

```typescript
useProposalCommentsQuery({ selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useProposalCommentQuery({ id: '<UUID>', selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateProposalCommentMutation({ selection: { fields: { id: true } } })
useUpdateProposalCommentMutation({ selection: { fields: { id: true } } })
useDeleteProposalCommentMutation({})
```

## Examples

### List all proposalComments

```typescript
const { data, isLoading } = useProposalCommentsQuery({
  selection: { fields: { actorId: true, attachments: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, line: true, outdatedAt: true, path: true, pathTrgmSimilarity: true, proposalId: true, resolvedAt: true, search: true, searchScore: true, searchTsvRank: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a proposalComment

```typescript
const { mutate } = useCreateProposalCommentMutation({
  selection: { fields: { id: true } },
});
mutate({ actorId: '<UUID>', attachments: '<Upload>', body: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', embedding: '<Vector>', line: '<Int>', outdatedAt: '<Datetime>', path: '<String>', proposalId: '<UUID>', resolvedAt: '<Datetime>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
