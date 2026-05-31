# agentSkill

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Structured procedural instructions for agent workflows

## Usage

```typescript
useAgentSkillsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } } })
useAgentSkillQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } } })
useCreateAgentSkillMutation({ selection: { fields: { id: true } } })
useUpdateAgentSkillMutation({ selection: { fields: { id: true } } })
useDeleteAgentSkillMutation({})
```

## Examples

### List all agentSkills

```typescript
const { data, isLoading } = useAgentSkillsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});
```

### Create a agentSkill

```typescript
const { mutate } = useCreateAgentSkillMutation({
  selection: { fields: { id: true } },
});
mutate({ createdBy: '<UUID>', updatedBy: '<UUID>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' });
```
