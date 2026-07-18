# agentResource

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Unified skills and knowledge resources for agent retrieval

## Usage

```typescript
useAgentResourcesQuery({ selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } } })
useAgentResourceQuery({ id: '<UUID>', selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } } })
useCreateAgentResourceMutation({ selection: { fields: { id: true } } })
useUpdateAgentResourceMutation({ selection: { fields: { id: true } } })
useDeleteAgentResourceMutation({})
```

## Examples

### List all agentResources

```typescript
const { data, isLoading } = useAgentResourcesQuery({
  selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } },
});
```

### Create a agentResource

```typescript
const { mutate } = useCreateAgentResourceMutation({
  selection: { fields: { id: true } },
});
mutate({ archivedAt: '<Datetime>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', kindTrgmSimilarity: '<Float>', metadata: '<JSON>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>' });
```
