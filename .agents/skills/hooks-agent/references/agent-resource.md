# agentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified skills and knowledge resources for agent retrieval

## Usage

```typescript
useAgentResourcesQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } } })
useAgentResourceQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } } })
useCreateAgentResourceMutation({ selection: { fields: { id: true } } })
useUpdateAgentResourceMutation({ selection: { fields: { id: true } } })
useDeleteAgentResourceMutation({})
```

## Examples

### List all agentResources

```typescript
const { data, isLoading } = useAgentResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, databaseId: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});
```

### Create a agentResource

```typescript
const { mutate } = useCreateAgentResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', databaseId: '<UUID>', slug: '<String>', kind: '<String>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', isArchived: '<Boolean>', archivedAt: '<Datetime>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', kindTrgmSimilarity: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' });
```
