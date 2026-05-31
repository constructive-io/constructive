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
| `agentMessage` | findMany, findOne, create, update, delete |
| `agentTask` | findMany, findOne, create, update, delete |
| `agentThread` | findMany, findOne, create, update, delete |
| `agentPrompt` | findMany, findOne, create, update, delete |
| `agentSkill` | findMany, findOne, create, update, delete |

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

### `db.agentMessage`

CRUD operations for AgentMessage records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `ownerId` | UUID | Yes |
| `parts` | JSON | Yes |
| `threadId` | UUID | Yes |
| `authorRole` | String | Yes |
| `model` | String | Yes |

**Operations:**

```typescript
// List all agentMessage records
const items = await db.agentMessage.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true, threadId: true, authorRole: true, model: true } }).execute();

// Get one by id
const item = await db.agentMessage.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, parts: true, threadId: true, authorRole: true, model: true } }).execute();

// Create
const created = await db.agentMessage.create({ data: { ownerId: '<UUID>', parts: '<JSON>', threadId: '<UUID>', authorRole: '<String>', model: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentMessage.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

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
| `ownerId` | UUID | Yes |
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
const items = await db.agentTask.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } }).execute();

// Get one by id
const item = await db.agentTask.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, planId: true, description: true, source: true, error: true, orderIndex: true, requiresApproval: true, approvalStatus: true, approvedBy: true, approvedAt: true, approvalFeedback: true } }).execute();

// Create
const created = await db.agentTask.create({ data: { ownerId: '<UUID>', status: '<String>', planId: '<UUID>', description: '<String>', source: '<String>', error: '<String>', orderIndex: '<Int>', requiresApproval: '<Boolean>', approvalStatus: '<String>', approvedBy: '<UUID>', approvedAt: '<Datetime>', approvalFeedback: '<String>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentTask.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentTask.delete({ where: { id: '<UUID>' } }).execute();
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
| `title` | String | Yes |
| `mode` | String | Yes |
| `model` | String | Yes |
| `systemPrompt` | String | Yes |
| `promptTemplateId` | UUID | Yes |

**Operations:**

```typescript
// List all agentThread records
const items = await db.agentThread.findMany({ select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } }).execute();

// Get one by id
const item = await db.agentThread.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, ownerId: true, status: true, title: true, mode: true, model: true, systemPrompt: true, promptTemplateId: true } }).execute();

// Create
const created = await db.agentThread.create({ data: { ownerId: '<UUID>', status: '<String>', title: '<String>', mode: '<String>', model: '<String>', systemPrompt: '<String>', promptTemplateId: '<UUID>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentThread.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentThread.delete({ where: { id: '<UUID>' } }).execute();
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

### `db.agentSkill`

CRUD operations for AgentSkill records.

**Fields:**

| Field | Type | Editable |
|-------|------|----------|
| `id` | UUID | No |
| `createdAt` | Datetime | No |
| `updatedAt` | Datetime | No |
| `createdBy` | UUID | Yes |
| `updatedBy` | UUID | Yes |
| `title` | String | Yes |
| `description` | String | Yes |
| `body` | String | Yes |
| `keywords` | String | Yes |
| `isActive` | Boolean | Yes |
| `metadata` | JSON | Yes |
| `search` | FullText | Yes |
| `embedding` | Vector | Yes |
| `embeddingUpdatedAt` | Datetime | Yes |
| `searchTsvRank` | Float | Yes |
| `embeddingVectorDistance` | Float | Yes |
| `titleTrgmSimilarity` | Float | Yes |
| `descriptionTrgmSimilarity` | Float | Yes |
| `bodyTrgmSimilarity` | Float | Yes |
| `searchScore` | Float | Yes |

**Operations:**

```typescript
// List all agentSkill records
const items = await db.agentSkill.findMany({ select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } }).execute();

// Get one by id
const item = await db.agentSkill.findOne({ id: '<UUID>', select: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, title: true, description: true, body: true, keywords: true, isActive: true, metadata: true, search: true, embedding: true, embeddingUpdatedAt: true, searchTsvRank: true, embeddingVectorDistance: true, titleTrgmSimilarity: true, descriptionTrgmSimilarity: true, bodyTrgmSimilarity: true, searchScore: true } }).execute();

// Create
const created = await db.agentSkill.create({ data: { createdBy: '<UUID>', updatedBy: '<UUID>', title: '<String>', description: '<String>', body: '<String>', keywords: '<String>', isActive: '<Boolean>', metadata: '<JSON>', search: '<FullText>', embedding: '<Vector>', embeddingUpdatedAt: '<Datetime>', searchTsvRank: '<Float>', embeddingVectorDistance: '<Float>', titleTrgmSimilarity: '<Float>', descriptionTrgmSimilarity: '<Float>', bodyTrgmSimilarity: '<Float>', searchScore: '<Float>' }, select: { id: true } }).execute();

// Update
const updated = await db.agentSkill.update({ where: { id: '<UUID>' }, data: { createdBy: '<UUID>' }, select: { id: true } }).execute();

// Delete
const deleted = await db.agentSkill.delete({ where: { id: '<UUID>' } }).execute();
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
