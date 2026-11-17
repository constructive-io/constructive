# platformRepository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Source repositories, hosted locally or on an external provider

## Usage

```typescript
usePlatformRepositoriesQuery({ selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
usePlatformRepositoryQuery({ id: '<UUID>', selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
useCreatePlatformRepositoryMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRepositoryMutation({ selection: { fields: { id: true } } })
useDeletePlatformRepositoryMutation({})
```

## Examples

### List all platformRepositories

```typescript
const { data, isLoading } = usePlatformRepositoriesQuery({
  selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } },
});
```

### Create a platformRepository

```typescript
const { mutate } = useCreatePlatformRepositoryMutation({
  selection: { fields: { id: true } },
});
mutate({ cloneUrl: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', defaultBranch: '<String>', description: '<String>', embedding: '<Vector>', externalId: '<String>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', ownerId: '<UUID>', provider: '<String>', slug: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>' });
```
