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
| `useAgentPlansQuery` | Query | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useAgentPlanQuery` | Query | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useCreateAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useUpdateAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useDeleteAgentPlanMutation` | Mutation | Workflow plan attached to an agent thread with ordered tasks and optional approval gates |
| `useAgentsQuery` | Query | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useAgentQuery` | Query | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useCreateAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useUpdateAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useDeleteAgentMutation` | Mutation | Agent instance registry (human-managed or ephemeral sub-agents) |
| `useAgentThreadsQuery` | Query | Top-level AI/LLM conversation thread |
| `useAgentThreadQuery` | Query | Top-level AI/LLM conversation thread |
| `useCreateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useUpdateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useDeleteAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useAgentMessagesQuery` | Query | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useAgentMessageQuery` | Query | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useCreateAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useUpdateAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useDeleteAgentMessageMutation` | Mutation | Message within an agent thread with TextPart/ToolPart jsonb parts |
| `useAgentTasksQuery` | Query | Task within a plan, with ordering and optional approval gates |
| `useAgentTaskQuery` | Query | Task within a plan, with ordering and optional approval gates |
| `useCreateAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
| `useUpdateAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
| `useDeleteAgentTaskMutation` | Mutation | Task within a plan, with ordering and optional approval gates |
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
| `useAgentPersonasQuery` | Query | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useAgentPersonaQuery` | Query | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useCreateAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useUpdateAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useDeleteAgentPersonaMutation` | Mutation | Agent persona templates (role, system prompt, default skills/knowledge) |
| `useAgentResourcesQuery` | Query | Unified skills and knowledge resources for agent retrieval |
| `useAgentResourceQuery` | Query | Unified skills and knowledge resources for agent retrieval |
| `useCreateAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useUpdateAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useDeleteAgentResourceMutation` | Mutation | Unified skills and knowledge resources for agent retrieval |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### AgentPlan

```typescript
// List all agentPlans
const { data, isLoading } = useAgentPlansQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } },
});

// Get one agentPlan
const { data: item } = useAgentPlanQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } },
});

// Create a agentPlan
const { mutate: create } = useCreateAgentPlanMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', threadId: '<UUID>', title: '<String>', description: '<String>', status: '<String>' });
```

### Agent

```typescript
// List all agents
const { data, isLoading } = useAgentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } },
});

// Get one agent
const { data: item } = useAgentQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } },
});

// Create a agent
const { mutate: create } = useCreateAgentMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', personaId: '<UUID>', parentId: '<UUID>', name: '<String>', systemPrompt: '<String>', config: '<JSON>', status: '<String>', isEphemeral: '<Boolean>' });
```

### AgentThread

```typescript
// List all agentThreads
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } },
});

// Get one agentThread
const { data: item } = useAgentThreadQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } },
});

// Create a agentThread
const { mutate: create } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', status: '<String>', isArchived: '<Boolean>', archivedAt: '<Datetime>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', tags: '<String>', promptTemplateId: '<UUID>', agentId: '<UUID>', parentThreadId: '<UUID>' });
```

### AgentMessage

```typescript
// List all agentMessages
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } },
});

// Get one agentMessage
const { data: item } = useAgentMessageQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } },
});

// Create a agentMessage
const { mutate: create } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', authorRole: '<String>', model: '<String>', agentId: '<UUID>' });
```

### AgentTask

```typescript
// List all agentTasks
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } },
});

// Get one agentTask
const { data: item } = useAgentTaskQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, actorId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } },
});

// Create a agentTask
const { mutate: create } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' });
```

### AgentPrompt

```typescript
// List all agentPrompts
const { data, isLoading } = useAgentPromptsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, name: true, content: true, description: true, isDefault: true, metadata: true } },
});

// Get one agentPrompt
const { data: item } = useAgentPromptQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, name: true, content: true, description: true, isDefault: true, metadata: true } },
});

// Create a agentPrompt
const { mutate: create } = useCreateAgentPromptMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', name: '<String>', content: '<String>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>' });
```

### AgentResourceChunk

```typescript
// List all agentResourceChunks
const { data, isLoading } = useAgentResourceChunksQuery({
  selection: { fields: { id: true, agentResourceId: true, body: true, chunkIndex: true, embedding: true, metadata: true, createdAt: true, updatedAt: true, embeddingVectorDistance: true, searchScore: true } },
});

// Get one agentResourceChunk
const { data: item } = useAgentResourceChunkQuery({
  id: '<UUID>',
  selection: { fields: { id: true, agentResourceId: true, body: true, chunkIndex: true, embedding: true, metadata: true, createdAt: true, updatedAt: true, embeddingVectorDistance: true, searchScore: true } },
});

// Create a agentResourceChunk
const { mutate: create } = useCreateAgentResourceChunkMutation({
  selection: { fields: { id: true } },
});
create({ agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', metadata: '<JSON>', embeddingVectorDistance: '<Float>', searchScore: '<Float>' });
```

### AgentPersona

```typescript
// List all agentPersonas
const { data, isLoading } = useAgentPersonasQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } },
});

// Get one agentPersona
const { data: item } = useAgentPersonaQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } },
});

// Create a agentPersona
const { mutate: create } = useCreateAgentPersonaMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', slug: '<String>', name: '<String>', description: '<String>', systemPrompt: '<String>', resources: '<String>', config: '<JSON>', isActive: '<Boolean>' });
```

### AgentResource

```typescript
// List all agentResources
const { data, isLoading } = useAgentResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});

// Get one agentResource
const { data: item } = useAgentResourceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});

// Create a agentResource
const { mutate: create } = useCreateAgentResourceMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', slug: '<String>', kind: '<String>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', isArchived: '<Boolean>', archivedAt: '<Datetime>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', kindTrgmSimilarity: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' });
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
