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
| `useAgentThreadsQuery` | Query | Top-level AI/LLM conversation thread |
| `useAgentThreadQuery` | Query | Top-level AI/LLM conversation thread |
| `useCreateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useUpdateAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useDeleteAgentThreadMutation` | Mutation | Top-level AI/LLM conversation thread |
| `useAgentPromptsQuery` | Query | Shared system prompt templates for agent conversations |
| `useAgentPromptQuery` | Query | Shared system prompt templates for agent conversations |
| `useCreateAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useUpdateAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useDeleteAgentPromptMutation` | Mutation | Shared system prompt templates for agent conversations |
| `useAgentSkillsQuery` | Query | Structured procedural instructions for agent workflows |
| `useAgentSkillQuery` | Query | Structured procedural instructions for agent workflows |
| `useCreateAgentSkillMutation` | Mutation | Structured procedural instructions for agent workflows |
| `useUpdateAgentSkillMutation` | Mutation | Structured procedural instructions for agent workflows |
| `useDeleteAgentSkillMutation` | Mutation | Structured procedural instructions for agent workflows |
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

### AgentMessage

```typescript
// List all agentMessages
const { data, isLoading } = useAgentMessagesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true, threadId: true, authorRole: true, model: true } },
});

// Get one agentMessage
const { data: item } = useAgentMessageQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true, threadId: true, authorRole: true, model: true } },
});

// Create a agentMessage
const { mutate: create } = useCreateAgentMessageMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', authorRole: '<String>', model: '<String>' });
```

### AgentTask

```typescript
// List all agentTasks
const { data, isLoading } = useAgentTasksQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } },
});

// Get one agentTask
const { data: item } = useAgentTaskQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } },
});

// Create a agentTask
const { mutate: create } = useCreateAgentTaskMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' });
```

### AgentThread

```typescript
// List all agentThreads
const { data, isLoading } = useAgentThreadsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } },
});

// Get one agentThread
const { data: item } = useAgentThreadQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } },
});

// Create a agentThread
const { mutate: create } = useCreateAgentThreadMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', status: '<String>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', promptTemplateId: '<UUID>' });
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

### AgentSkill

```typescript
// List all agentSkills
const { data, isLoading } = useAgentSkillsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});

// Get one agentSkill
const { data: item } = useAgentSkillQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } },
});

// Create a agentSkill
const { mutate: create } = useCreateAgentSkillMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' });
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
