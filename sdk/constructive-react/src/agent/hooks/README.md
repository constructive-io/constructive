# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useAgentsQuery` | Query | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useAgentQuery` | Query | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useCreateAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useUpdateAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useDeleteAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useAgentMessagesQuery` | Query | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useAgentMessageQuery` | Query | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useCreateAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useUpdateAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useDeleteAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useAgentPersonasQuery` | Query | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useAgentPersonaQuery` | Query | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useCreateAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useUpdateAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useDeleteAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useAgentPlansQuery` | Query | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useAgentPlanQuery` | Query | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useCreateAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useUpdateAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useDeleteAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useAgentPromptsQuery` | Query | Shared system prompt templates for agent conversations |
| `useAgentPromptQuery` | Query | Shared system prompt templates for agent conversations |
| `useCreateAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useUpdateAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useDeleteAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useAgentResourceChunksQuery` | Query | List all agentResourceChunks |
| `useAgentResourceChunkQuery` | Query | Get one agentResourceChunk |
| `useCreateAgentResourceChunkMutation` | Mutation | Create a agentResourceChunk |
| `useUpdateAgentResourceChunkMutation` | Mutation | Update a agentResourceChunk |
| `useDeleteAgentResourceChunkMutation` | Mutation | Delete a agentResourceChunk |
| `useAgentResourcesQuery` | Query | Unified skills and knowledge resources for agent retrieval |
| `useAgentResourceQuery` | Query | Unified skills and knowledge resources for agent retrieval |
| `useCreateAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useUpdateAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useDeleteAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useAgentTasksQuery` | Query | Task within a plan, with ordering and optional approval gates |
| `useAgentTaskQuery` | Query | Task within a plan, with ordering and optional approval gates |
| `useCreateAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
| `useUpdateAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
| `useDeleteAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
| `useAgentThreadsQuery` | Query | Top-level AI/LLM conversation thread |
| `useAgentThreadQuery` | Query | Top-level AI/LLM conversation thread |
| `useCreateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useUpdateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useDeleteAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### Agent

```typescript
// List all agents
const { data, isLoading } = useAgentsQuery({
  selection: { fields: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } },
});

// Get one agent
const { data: item } = useAgentQuery({
  id: '<UUID>',
  selection: { fields: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } },
});

// Create a agent
const { mutate: create } = useCreateAgentMutation({
  selection: { fields: { id: true } },
});
create({ config: '<JSON>', databaseId: '<UUID>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' });
```

### AgentMessage

```typescript
// List all agentMessages
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } },
});

// Get one agentMessage
const { data: item } = useAgentMessageQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } },
});

// Create a agentMessage
const { mutate: create } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', databaseId: '<UUID>', model: '<String>', parts: '<JSON>', threadId: '<UUID>' });
```

### AgentPersona

```typescript
// List all agentPersonas
const { data, isLoading } = useAgentPersonasQuery({
  selection: { fields: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } },
});

// Get one agentPersona
const { data: item } = useAgentPersonaQuery({
  id: '<UUID>',
  selection: { fields: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } },
});

// Create a agentPersona
const { mutate: create } = useCreateAgentPersonaMutation({
  selection: { fields: { id: true } },
});
create({ config: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>' });
```

### AgentPlan

```typescript
// List all agentPlans
const { data, isLoading } = useAgentPlansQuery({
  selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } },
});

// Get one agentPlan
const { data: item } = useAgentPlanQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } },
});

// Create a agentPlan
const { mutate: create } = useCreateAgentPlanMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>' });
```

### AgentPrompt

```typescript
// List all agentPrompts
const { data, isLoading } = useAgentPromptsQuery({
  selection: { fields: { content: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true } },
});

// Get one agentPrompt
const { data: item } = useAgentPromptQuery({
  id: '<UUID>',
  selection: { fields: { content: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true } },
});

// Create a agentPrompt
const { mutate: create } = useCreateAgentPromptMutation({
  selection: { fields: { id: true } },
});
create({ content: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>' });
```

### AgentResourceChunk

```typescript
// List all agentResourceChunks
const { data, isLoading } = useAgentResourceChunksQuery({
  selection: { fields: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } },
});

// Get one agentResourceChunk
const { data: item } = useAgentResourceChunkQuery({
  id: '<UUID>',
  selection: { fields: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } },
});

// Create a agentResourceChunk
const { mutate: create } = useCreateAgentResourceChunkMutation({
  selection: { fields: { id: true } },
});
create({ agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', searchScore: '<Float>' });
```

### AgentResource

```typescript
// List all agentResources
const { data, isLoading } = useAgentResourcesQuery({
  selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } },
});

// Get one agentResource
const { data: item } = useAgentResourceQuery({
  id: '<UUID>',
  selection: { fields: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } },
});

// Create a agentResource
const { mutate: create } = useCreateAgentResourceMutation({
  selection: { fields: { id: true } },
});
create({ archivedAt: '<Datetime>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', kindTrgmSimilarity: '<Float>', metadata: '<JSON>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>' });
```

### AgentTask

```typescript
// List all agentTasks
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } },
});

// Get one agentTask
const { data: item } = useAgentTaskQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } },
});

// Create a agentTask
const { mutate: create } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', databaseId: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>' });
```

### AgentThread

```typescript
// List all agentThreads
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } },
});

// Get one agentThread
const { data: item } = useAgentThreadQuery({
  id: '<UUID>',
  selection: { fields: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } },
});

// Create a agentThread
const { mutate: create } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
create({ agentId: '<UUID>', archivedAt: '<Datetime>', databaseId: '<UUID>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>' });
```

## Custom Operation Hooks

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
