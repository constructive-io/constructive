# proposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Files a reviewer has read, pinned to the blob they read

## Usage

```typescript
useProposalFileViewsQuery({ selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } } })
useProposalFileViewQuery({ id: '<UUID>', selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } } })
useCreateProposalFileViewMutation({ selection: { fields: { id: true } } })
useUpdateProposalFileViewMutation({ selection: { fields: { id: true } } })
useDeleteProposalFileViewMutation({})
```

## Examples

### List all proposalFileViews

```typescript
const { data, isLoading } = useProposalFileViewsQuery({
  selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, databaseId: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } },
});
```

### Create a proposalFileView

```typescript
const { mutate } = useCreateProposalFileViewMutation({
  selection: { fields: { id: true } },
});
mutate({ blobSha: '<String>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' });
```
