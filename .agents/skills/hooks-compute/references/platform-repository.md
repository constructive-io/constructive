# platformRepository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Source repositories, hosted locally or on an external provider

## Usage

```typescript
usePlatformRepositoriesQuery({ selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
usePlatformRepositoryQuery({ id: '<UUID>', selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
useCreatePlatformRepositoryMutation({ selection: { fields: { id: true } } })
useUpdatePlatformRepositoryMutation({ selection: { fields: { id: true } } })
useDeletePlatformRepositoryMutation({})
```

## Examples

### List all platformRepositories

```typescript
const { data, isLoading } = usePlatformRepositoriesQuery({
  selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } },
});
```

### Create a platformRepository

```typescript
const { mutate } = useCreatePlatformRepositoryMutation({
  selection: { fields: { id: true } },
});
mutate({ cloneUrl: '<String>', cloneUrlTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', defaultBranch: '<String>', defaultBranchTrgmSimilarity: '<Float>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', externalId: '<String>', externalIdTrgmSimilarity: '<Float>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', nameTrgmSimilarity: '<Float>', ownerId: '<UUID>', provider: '<String>', providerTrgmSimilarity: '<Float>', requiredChecks: '<String>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', slugTrgmSimilarity: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>', visibilityTrgmSimilarity: '<Float>' });
```
