# repository

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Source repositories, hosted locally or on an external provider

## Usage

```typescript
useRepositoriesQuery({ selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
useRepositoryQuery({ id: '<UUID>', selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } } })
useCreateRepositoryMutation({ selection: { fields: { id: true } } })
useUpdateRepositoryMutation({ selection: { fields: { id: true } } })
useDeleteRepositoryMutation({})
```

## Examples

### List all repositories

```typescript
const { data, isLoading } = useRepositoriesQuery({
  selection: { fields: { cloneUrl: true, cloneUrlTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, defaultBranch: true, defaultBranchTrgmSimilarity: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, externalId: true, externalIdTrgmSimilarity: true, id: true, isArchived: true, metadata: true, name: true, nameTrgmSimilarity: true, ownerId: true, provider: true, providerTrgmSimilarity: true, requiredChecks: true, search: true, searchScore: true, searchTsvRank: true, slug: true, slugTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true, visibility: true, visibilityTrgmSimilarity: true } },
});
```

### Create a repository

```typescript
const { mutate } = useCreateRepositoryMutation({
  selection: { fields: { id: true } },
});
mutate({ cloneUrl: '<String>', cloneUrlTrgmSimilarity: '<Float>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', defaultBranch: '<String>', defaultBranchTrgmSimilarity: '<Float>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', externalId: '<String>', externalIdTrgmSimilarity: '<Float>', isArchived: '<Boolean>', metadata: '<JSON>', name: '<String>', nameTrgmSimilarity: '<Float>', ownerId: '<UUID>', provider: '<String>', providerTrgmSimilarity: '<Float>', requiredChecks: '<String>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', slugTrgmSimilarity: '<Float>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>', visibility: '<String>', visibilityTrgmSimilarity: '<Float>' });
```
