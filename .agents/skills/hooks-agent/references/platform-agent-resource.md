# platformAgentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified skills and knowledge resources for agent retrieval

## Usage

```typescript
usePlatformAgentResourcesQuery({ selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
usePlatformAgentResourceQuery({ id: '<UUID>', selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreatePlatformAgentResourceMutation({ selection: { fields: { id: true } } })
useUpdatePlatformAgentResourceMutation({ selection: { fields: { id: true } } })
useDeletePlatformAgentResourceMutation({})
```

## Examples

### List all platformAgentResources

```typescript
const { data, isLoading } = usePlatformAgentResourcesQuery({
  selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a platformAgentResource

```typescript
const { mutate } = useCreatePlatformAgentResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ archivedAt: '<Datetime>', body: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', description: '<String>', embedding: '<Vector>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', metadata: '<JSON>', slug: '<String>', title: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
