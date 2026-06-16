# ORM Client

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { createClient } from './orm';

const db = createClient({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});
```

## Models

| Model | Operations |
|-------|------------|
| `agentPlan` | findMany, findOne, create, update, delete |
| `agent` | findMany, findOne, create, update, delete |
| `agentThread` | findMany, findOne, create, update, delete |
| `agentMessage` | findMany, findOne, create, update, delete |
| `agentTask` | findMany, findOne, create, update, delete |
| `agentPrompt` | findMany, findOne, create, update, delete |
| `agentResourceChunk` | findMany, findOne, create, update, delete |
| `agentPersona` | findMany, findOne, create, update, delete |
| `agentResource` | findMany, findOne, create, update, delete |

## Table Operations

### `db.agentPlan`

CRUD operations for AgentPlan records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `threadId` | UUID | Yes |
| `title` | String | Yes |
| `description` | String | Yes |
| `status` | String | Yes |

**Operations:**

```typescript
// List all agentPlan records
const items = await db.agentPlan.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } }).execute();

// Get one by id
const item = await db.agentPlan.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, threadId: true, title: true, description: true, status: true } }).execute();

// Create
const created = await db.agentPlan.create({ data: { ownerId: '<UUID>', threadId: '<UUID>', title: '<String>', description: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPlan.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPlan.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agent`

CRUD operations for Agent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `personaId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `name` | String | Yes |
| `systemPrompt` | String | Yes |
| `config` | JSON | Yes |
| `status` | String | Yes |
| `isEphemeral` | Boolean | Yes |

**Operations:**

```typescript
// List all agent records
const items = await db.agent.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } }).execute();

// Get one by id
const item = await db.agent.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, personaId: true, parentId: true, name: true, systemPrompt: true, config: true, status: true, isEphemeral: true } }).execute();

// Create
const created = await db.agent.create({ data: { ownerId: '<UUID>', personaId: '<UUID>', parentId: '<UUID>', name: '<String>', systemPrompt: '<String>', config: '<JSON>', status: '<String>', isEphemeral: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.agent.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentThread`

CRUD operations for AgentThread records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `status` | String | Yes |
| `isArchived` | Boolean | Yes |
| `archivedAt` | Datetime | Yes |
| `title` | String | Yes |
| `mode` | String | Yes |
| `model` | String | Yes |
| `systemPrompt` | String | Yes |
| `tags` | String | Yes |
| `promptTemplateId` | UUID | Yes |
| `agentId` | UUID | Yes |
| `parentThreadId` | UUID | Yes |

**Operations:**

```typescript
// List all agentThread records
const items = await db.agentThread.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } }).execute();

// Get one by id
const item = await db.agentThread.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, isArchived: true, archivedAt: true, title: true, mode: true, model: true, systemPrompt: true, tags: true, promptTemplateId: true, agentId: true, parentThreadId: true } }).execute();

// Create
const created = await db.agentThread.create({ data: { ownerId: '<UUID>', status: '<String>', isArchived: '<Boolean>', archivedAt: '<Datetime>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', tags: '<String>', promptTemplateId: '<UUID>', agentId: '<UUID>', parentThreadId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentThread.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentThread.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentMessage`

CRUD operations for AgentMessage records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `actorId` | UUID | Yes |
| `parts` | JSON | Yes |
| `threadId` | UUID | Yes |
| `authorRole` | String | Yes |
| `model` | String | Yes |
| `agentId` | UUID | Yes |

**Operations:**

```typescript
// List all agentMessage records
const items = await db.agentMessage.findMany({ select: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } }).execute();

// Get one by id
const item = await db.agentMessage.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, actorId: true, parts: true, threadId: true, authorRole: true, model: true, agentId: true } }).execute();

// Create
const created = await db.agentMessage.create({ data: { actorId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', authorRole: '<String>', model: '<String>', agentId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentMessage.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentMessage.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentTask`

CRUD operations for AgentTask records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `actorId` | UUID | Yes |
| `status` | String | Yes |
| `planId` | UUID | Yes |
| `description` | String | Yes |
| `source` | String | Yes |
| `error` | String | Yes |
| `orderIndex` | Int | Yes |
| `requiresApproval` | Boolean | Yes |
| `approvalStatus` | String | Yes |
| `approvedBy` | UUID | Yes |
| `approvedAt` | Datetime | Yes |
| `approvalFeedback` | String | Yes |

**Operations:**

```typescript
// List all agentTask records
const items = await db.agentTask.findMany({ select: { id: true, createdAt: true, updatedAt: true, actorId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } }).execute();

// Get one by id
const item = await db.agentTask.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, actorId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } }).execute();

// Create
const created = await db.agentTask.create({ data: { actorId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentTask.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentTask.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentPrompt`

CRUD operations for AgentPrompt records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `name` | String | Yes |
| `content` | String | Yes |
| `description` | String | Yes |
| `isDefault` | Boolean | Yes |
| `metadata` | JSON | Yes |

**Operations:**

```typescript
// List all agentPrompt records
const items = await db.agentPrompt.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, name: true, content: true, description: true, isDefault: true, metadata: true } }).execute();

// Get one by id
const item = await db.agentPrompt.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, name: true, content: true, description: true, isDefault: true, metadata: true } }).execute();

// Create
const created = await db.agentPrompt.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', name: '<String>', content: '<String>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPrompt.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPrompt.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentResourceChunk`

CRUD operations for AgentResourceChunk records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `agentResourceId` | UUID | Yes |
| `body` | String | Yes |
| `chunkIndex` | Int | Yes |
| `embedding` | Vector | Yes |
| `metadata` | JSON | Yes |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `embeddingVectorDistance` | Float | Yes |
| `searchScore` | Float | Yes |

**Operations:**

```typescript
// List all agentResourceChunk records
const items = await db.agentResourceChunk.findMany({ select: { id: true, agentResourceId: true, body: true, chunkIndex: true, embedding: true, metadata: true, createdAt: true, updatedAt: true, embeddingVectorDistance: true, searchScore: true } }).execute();

// Get one by id
const item = await db.agentResourceChunk.findOne({ id: '<UUID>', select: { id: true, agentResourceId: true, body: true, chunkIndex: true, embedding: true, metadata: true, createdAt: true, updatedAt: true, embeddingVectorDistance: true, searchScore: true } }).execute();

// Create
const created = await db.agentResourceChunk.create({ data: { agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', metadata: '<JSON>', embeddingVectorDistance: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentResourceChunk.update({ where: { id: '<UUID>' }, data: { agentResourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentResourceChunk.delete({ where: { id: '<UUID>' } }).execute();
```

> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

### `db.agentPersona`

CRUD operations for AgentPersona records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `slug` | String | Yes |
| `name` | String | Yes |
| `description` | String | Yes |
| `systemPrompt` | String | Yes |
| `resources` | String | Yes |
| `config` | JSON | Yes |
| `isActive` | Boolean | Yes |

**Operations:**

```typescript
// List all agentPersona records
const items = await db.agentPersona.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } }).execute();

// Get one by id
const item = await db.agentPersona.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, name: true, description: true, systemPrompt: true, resources: true, config: true, isActive: true } }).execute();

// Create
const created = await db.agentPersona.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', slug: '<String>', name: '<String>', description: '<String>', systemPrompt: '<String>', resources: '<String>', config: '<JSON>', isActive: '<Boolean>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPersona.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPersona.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentResource`

CRUD operations for AgentResource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `slug` | String | Yes |
| `kind` | String | Yes |
| `title` | String | Yes |
| `description` | String | Yes |
| `body` | String | Yes |
| `keywords` | String | Yes |
| `isActive` | Boolean | Yes |
| `metadata` | JSON | Yes |
| `isArchived` | Boolean | Yes |
| `archivedAt` | Datetime | Yes |
| `search` | FullText | Yes |
| `embedding` | Vector | Yes |
| `embeddingUpdatedAt` | Datetime | Yes |
| `searchTsvRank` | Float | Yes |
| `embeddingVectorDistance` | Float | Yes |
| `kindTrgmSimilarity` | Float | Yes |
| `titleTrgmSimilarity` | Float | Yes |
| `descriptionTrgmSimilarity` | Float | Yes |
| `bodyTrgmSimilarity` | Float | Yes |
| `searchScore` | Float | Yes |

**Operations:**

```typescript
// List all agentResource records
const items = await db.agentResource.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } }).execute();

// Get one by id
const item = await db.agentResource.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, slug: true, kind: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, isArchived: true, archivedAt: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, kindTrgmSimilarity: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } }).execute();

// Create
const created = await db.agentResource.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', slug: '<String>', kind: '<String>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', isArchived: '<Boolean>', archivedAt: '<Datetime>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', kindTrgmSimilarity: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentResource.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentResource.delete({ where: { id: '<UUID>' } }).execute();
```

> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

> **Unified Search API fields:** `search`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Custom Operations

### `db.mutation.provisionBucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

```typescript
const result = await db.mutation.provisionBucket({ input: { bucketKey: '<String>', ownerId: '<UUID>' } }).execute();
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
