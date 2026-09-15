# platformProposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Files a reviewer has read, pinned to the blob they read

## Usage

```typescript
usePlatformProposalFileViewsQuery({ selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } } })
usePlatformProposalFileViewQuery({ id: '<UUID>', selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } } })
useCreatePlatformProposalFileViewMutation({ selection: { fields: { id: true } } })
useUpdatePlatformProposalFileViewMutation({ selection: { fields: { id: true } } })
useDeletePlatformProposalFileViewMutation({})
```

## Examples

### List all platformProposalFileViews

```typescript
const { data, isLoading } = usePlatformProposalFileViewsQuery({
  selection: { fields: { blobSha: true, createdAt: true, createdByPrincipal: true, id: true, path: true, proposalId: true, reviewerId: true, updatedAt: true, updatedByPrincipal: true, viewedAt: true } },
});
```

### Create a platformProposalFileView

```typescript
const { mutate } = useCreatePlatformProposalFileViewMutation({
  selection: { fields: { id: true } },
});
mutate({ blobSha: '<String>', createdByPrincipal: '<UUID>', path: '<String>', proposalId: '<UUID>', reviewerId: '<UUID>', updatedByPrincipal: '<UUID>', viewedAt: '<Datetime>' });
```
