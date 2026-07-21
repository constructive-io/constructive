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
| `agent` | findMany, findOne, create, update, delete |
| `agentMessage` | findMany, findOne, create, update, delete |
| `agentPersona` | findMany, findOne, create, update, delete |
| `agentPlan` | findMany, findOne, create, update, delete |
| `agentPrompt` | findMany, findOne, create, update, delete |
| `agentResourceChunk` | findMany, findOne, create, update, delete |
| `agentResource` | findMany, findOne, create, update, delete |
| `agentTask` | findMany, findOne, create, update, delete |
| `agentThread` | findMany, findOne, create, update, delete |

## Table Operations

### `db.agent`

CRUD operations for Agent records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `config` | JSON | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `isEphemeral` | Boolean | Yes |
| `name` | String | Yes |
| `ownerId` | UUID | Yes |
| `parentId` | UUID | Yes |
| `personaId` | UUID | Yes |
| `status` | String | Yes |
| `systemPrompt` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agent records
const items = await db.agent.findMany({ select: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agent.findOne({ id: '<UUID>', select: { config: true, createdAt: true, databaseId: true, id: true, isEphemeral: true, name: true, ownerId: true, parentId: true, personaId: true, status: true, systemPrompt: true, updatedAt: true } }).execute();

// Create
const created = await db.agent.create({ data: { config: '<JSON>', databaseId: '<UUID>', isEphemeral: '<Boolean>', name: '<String>', ownerId: '<UUID>', parentId: '<UUID>', personaId: '<UUID>', status: '<String>', systemPrompt: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agent.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agent.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentMessage`

CRUD operations for AgentMessage records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `agentId` | UUID | Yes |
| `authorRole` | String | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `model` | String | Yes |
| `parts` | JSON | Yes |
| `threadId` | UUID | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agentMessage records
const items = await db.agentMessage.findMany({ select: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agentMessage.findOne({ id: '<UUID>', select: { actorId: true, agentId: true, authorRole: true, createdAt: true, databaseId: true, id: true, model: true, parts: true, threadId: true, updatedAt: true } }).execute();

// Create
const created = await db.agentMessage.create({ data: { actorId: '<UUID>', agentId: '<UUID>', authorRole: '<String>', databaseId: '<UUID>', model: '<String>', parts: '<JSON>', threadId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentMessage.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentMessage.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentPersona`

CRUD operations for AgentPersona records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `config` | JSON | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `name` | String | Yes |
| `resources` | String | Yes |
| `slug` | String | Yes |
| `systemPrompt` | String | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all agentPersona records
const items = await db.agentPersona.findMany({ select: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.agentPersona.findOne({ id: '<UUID>', select: { config: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isActive: true, name: true, resources: true, slug: true, systemPrompt: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.agentPersona.create({ data: { config: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', name: '<String>', resources: '<String>', slug: '<String>', systemPrompt: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPersona.update({ where: { id: '<UUID>' }, data: { config: '<JSON>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPersona.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentPlan`

CRUD operations for AgentPlan records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `ownerId` | UUID | Yes |
| `status` | String | Yes |
| `threadId` | UUID | Yes |
| `title` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agentPlan records
const items = await db.agentPlan.findMany({ select: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agentPlan.findOne({ id: '<UUID>', select: { createdAt: true, databaseId: true, description: true, id: true, ownerId: true, status: true, threadId: true, title: true, updatedAt: true } }).execute();

// Create
const created = await db.agentPlan.create({ data: { databaseId: '<UUID>', description: '<String>', ownerId: '<UUID>', status: '<String>', threadId: '<UUID>', title: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPlan.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPlan.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentPrompt`

CRUD operations for AgentPrompt records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `content` | String | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `id` | UUID | No |
| `isDefault` | Boolean | Yes |
| `metadata` | JSON | Yes |
| `name` | String | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all agentPrompt records
const items = await db.agentPrompt.findMany({ select: { content: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.agentPrompt.findOne({ id: '<UUID>', select: { content: true, createdAt: true, createdBy: true, databaseId: true, description: true, id: true, isDefault: true, metadata: true, name: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.agentPrompt.create({ data: { content: '<String>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', isDefault: '<Boolean>', metadata: '<JSON>', name: '<String>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentPrompt.update({ where: { id: '<UUID>' }, data: { content: '<String>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentPrompt.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentResourceChunk`

CRUD operations for AgentResourceChunk records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `agentResourceId` | UUID | Yes |
| `body` | String | Yes |
| `chunkIndex` | Int | Yes |
| `createdAt` | Datetime | No |
| `embedding` | Vector | Yes |
| `embeddingVectorDistance` | Float | Yes |
| `id` | UUID | No |
| `metadata` | JSON | Yes |
| `searchScore` | Float | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agentResourceChunk records
const items = await db.agentResourceChunk.findMany({ select: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agentResourceChunk.findOne({ id: '<UUID>', select: { agentResourceId: true, body: true, chunkIndex: true, createdAt: true, embedding: true, embeddingVectorDistance: true, id: true, metadata: true, searchScore: true, updatedAt: true } }).execute();

// Create
const created = await db.agentResourceChunk.create({ data: { agentResourceId: '<UUID>', body: '<String>', chunkIndex: '<Int>', embedding: '<Vector>', embeddingVectorDistance: '<Float>', metadata: '<JSON>', searchScore: '<Float>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentResourceChunk.update({ where: { id: '<UUID>' }, data: { agentResourceId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentResourceChunk.delete({ where: { id: '<UUID>' } }).execute();
```

> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

### `db.agentResource`

CRUD operations for AgentResource records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `archivedAt` | Datetime | Yes |
| `body` | String | Yes |
| `bodyTrgmSimilarity` | Float | Yes |
| `createdAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `descriptionTrgmSimilarity` | Float | Yes |
| `embedding` | Vector | Yes |
| `embeddingUpdatedAt` | Datetime | Yes |
| `embeddingVectorDistance` | Float | Yes |
| `id` | UUID | No |
| `isActive` | Boolean | Yes |
| `isArchived` | Boolean | Yes |
| `keywords` | String | Yes |
| `kind` | String | Yes |
| `kindTrgmSimilarity` | Float | Yes |
| `metadata` | JSON | Yes |
| `search` | FullText | Yes |
| `searchScore` | Float | Yes |
| `searchTsvRank` | Float | Yes |
| `slug` | String | Yes |
| `title` | String | Yes |
| `titleTrgmSimilarity` | Float | Yes |
| `updatedAt` | Datetime | No |
| `updatedBy` | UUID | Yes |

**Operations:**

```typescript
// List all agentResource records
const items = await db.agentResource.findMany({ select: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } }).execute();

// Get one by id
const item = await db.agentResource.findOne({ id: '<UUID>', select: { archivedAt: true, body: true, bodyTrgmSimilarity: true, createdAt: true, createdBy: true, databaseId: true, description: true, descriptionTrgmSimilarity: true, embedding: true, embeddingUpdatedAt: true, embeddingVectorDistance: true, id: true, isActive: true, isArchived: true, keywords: true, kind: true, kindTrgmSimilarity: true, metadata: true, search: true, searchScore: true, searchTsvRank: true, slug: true, title: true, titleTrgmSimilarity: true, updatedAt: true, updatedBy: true } }).execute();

// Create
const created = await db.agentResource.create({ data: { archivedAt: '<Datetime>', body: '<String>', bodyTrgmSimilarity: '<Float>', createdBy: '<UUID>', databaseId: '<UUID>', description: '<String>', descriptionTrgmSimilarity: '<Float>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', embeddingVectorDistance: '<Float>', isActive: '<Boolean>', isArchived: '<Boolean>', keywords: '<String>', kind: '<String>', kindTrgmSimilarity: '<Float>', metadata: '<JSON>', search: '<FullText>', searchScore: '<Float>', searchTsvRank: '<Float>', slug: '<String>', title: '<String>', titleTrgmSimilarity: '<Float>', updatedBy: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentResource.update({ where: { id: '<UUID>' }, data: { archivedAt: '<Datetime>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentResource.delete({ where: { id: '<UUID>' } }).execute();
```

> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance.

> **Unified Search API fields:** `search`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

### `db.agentTask`

CRUD operations for AgentTask records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `actorId` | UUID | Yes |
| `approvalFeedback` | String | Yes |
| `approvalStatus` | String | Yes |
| `approvedAt` | Datetime | Yes |
| `approvedBy` | UUID | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `description` | String | Yes |
| `error` | String | Yes |
| `id` | UUID | No |
| `orderIndex` | Int | Yes |
| `planId` | UUID | Yes |
| `requiresApproval` | Boolean | Yes |
| `source` | String | Yes |
| `status` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agentTask records
const items = await db.agentTask.findMany({ select: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agentTask.findOne({ id: '<UUID>', select: { actorId: true, approvalFeedback: true, approvalStatus: true, approvedAt: true, approvedBy: true, createdAt: true, databaseId: true, description: true, error: true, id: true, orderIndex: true, planId: true, requiresApproval: true, source: true, status: true, updatedAt: true } }).execute();

// Create
const created = await db.agentTask.create({ data: { actorId: '<UUID>', approvalFeedback: '<String>', approvalStatus: '<String>', approvedAt: '<Datetime>', approvedBy: '<UUID>', databaseId: '<UUID>', description: '<String>', error: '<String>', orderIndex: '<Int>', planId: '<UUID>', requiresApproval: '<Boolean>', source: '<String>', status: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentTask.update({ where: { id: '<UUID>' }, data: { actorId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentTask.delete({ where: { id: '<UUID>' } }).execute();
```

### `db.agentThread`

CRUD operations for AgentThread records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `agentId` | UUID | Yes |
| `archivedAt` | Datetime | Yes |
| `createdAt` | Datetime | No |
| `databaseId` | UUID | Yes |
| `id` | UUID | No |
| `isArchived` | Boolean | Yes |
| `mode` | String | Yes |
| `model` | String | Yes |
| `ownerId` | UUID | Yes |
| `parentThreadId` | UUID | Yes |
| `promptTemplateId` | UUID | Yes |
| `status` | String | Yes |
| `systemPrompt` | String | Yes |
| `tags` | String | Yes |
| `title` | String | Yes |
| `updatedAt` | Datetime | No |

**Operations:**

```typescript
// List all agentThread records
const items = await db.agentThread.findMany({ select: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } }).execute();

// Get one by id
const item = await db.agentThread.findOne({ id: '<UUID>', select: { agentId: true, archivedAt: true, createdAt: true, databaseId: true, id: true, isArchived: true, mode: true, model: true, ownerId: true, parentThreadId: true, promptTemplateId: true, status: true, systemPrompt: true, tags: true, title: true, updatedAt: true } }).execute();

// Create
const created = await db.agentThread.create({ data: { agentId: '<UUID>', archivedAt: '<Datetime>', databaseId: '<UUID>', isArchived: '<Boolean>', mode: '<String>', model: '<String>', ownerId: '<UUID>', parentThreadId: '<UUID>', promptTemplateId: '<UUID>', status: '<String>', systemPrompt: '<String>', tags: '<String>', title: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentThread.update({ where: { id: '<UUID>' }, data: { agentId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentThread.delete({ where: { id: '<UUID>' } }).execute();
```

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
