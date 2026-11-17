# agentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified skills and knowledge resources for agent retrieval

## Usage

```typescript
useAgentResourcesQuery({ selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useAgentResourceQuery({ id: '<UUID>', selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } } })
useCreateAgentResourceMutation({ selection: { fields: { id: true } } })
useUpdateAgentResourceMutation({ selection: { fields: { id: true } } })
useDeleteAgentResourceMutation({})
```

## Examples

### List all agentResources

```typescript
const { data, isLoading } = useAgentResourcesQuery({
  selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, createdByPrincipal: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingModel: true, embeddingModelTrgmSimilarity: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true, updatedByPrincipal: true } },
});
```

### Create a agentResource

```typescript
const { mutate } = useCreateAgentResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ archivedAt: '<Datetime>', body: '<String>', createdBy: '<UUID>', createdByPrincipal: '<UUID>', databaseId: '<UUID>', description: '<String>', embedding: '<Vector>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', metadata: '<JSON>', slug: '<String>', title: '<String>', updatedBy: '<UUID>', updatedByPrincipal: '<UUID>' });
```
