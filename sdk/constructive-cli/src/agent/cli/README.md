# csdk CLI

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```bash
# Create a context pointing at your GraphQL endpoint
csdk context create production --endpoint https://api.example.com/graphql

# Set the active context
csdk context use production

# Authenticate
csdk auth set-token <your-token>
```

## Commands

| Command | Description |
|---------|-------------|
| `context` | Manage API contexts (endpoints) |
| `auth` | Manage authentication tokens |
| `config` | Manage config key-value store (per-context) |
| `agent-plan` | agentPlan CRUD operations |
| `agent` | agent CRUD operations |
| `agent-thread` | agentThread CRUD operations |
| `agent-message` | agentMessage CRUD operations |
| `agent-task` | agentTask CRUD operations |
| `agent-prompt` | agentPrompt CRUD operations |
| `agent-resource-chunk` | agentResourceChunk CRUD operations |
| `agent-persona` | agentPersona CRUD operations |
| `agent-resource` | agentResource CRUD operations |
| `provision-bucket` | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Infrastructure Commands

### `context`

Manage named API contexts (kubectl-style).

| Subcommand | Description |
|------------|-------------|
| `create <name> --endpoint <url>` | Create a new context |
| `list` | List all contexts |
| `use <name>` | Set the active context |
| `current` | Show current context |
| `delete <name>` | Delete a context |

Configuration is stored at `~/.csdk/config/`.

### `auth`

Manage authentication tokens per context.

| Subcommand | Description |
|------------|-------------|
| `set-token <token>` | Store bearer token for current context |
| `status` | Show auth status across all contexts |
| `logout` | Remove credentials for current context |

### `config`

Manage per-context key-value configuration variables.

| Subcommand | Description |
|------------|-------------|
| `get <key>` | Get a config value |
| `set <key> <value>` | Set a config value |
| `list` | List all config values |
| `delete <key>` | Delete a config value |

Variables are scoped to the active context and stored at `~/.csdk/config/`.

## Table Commands

### `agent-plan`

CRUD operations for AgentPlan records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentPlan records |
| `find-first` | Find first matching agentPlan record |
| `get` | Get a agentPlan by id |
| `create` | Create a new agentPlan |
| `update` | Update an existing agentPlan |
| `delete` | Delete a agentPlan |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `ownerId` | UUID |
| `threadId` | UUID |
| `title` | String |
| `description` | String |
| `status` | String |

**Required create fields:** `threadId`, `title`
**Optional create fields (backend defaults):** `ownerId`, `description`, `status`

### `agent`

CRUD operations for Agent records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agent records |
| `find-first` | Find first matching agent record |
| `get` | Get a agent by id |
| `create` | Create a new agent |
| `update` | Update an existing agent |
| `delete` | Delete a agent |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `ownerId` | UUID |
| `personaId` | UUID |
| `parentId` | UUID |
| `name` | String |
| `systemPrompt` | String |
| `config` | JSON |
| `status` | String |
| `isEphemeral` | Boolean |

**Required create fields:** `name`
**Optional create fields (backend defaults):** `ownerId`, `personaId`, `parentId`, `systemPrompt`, `config`, `status`, `isEphemeral`

### `agent-thread`

CRUD operations for AgentThread records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentThread records |
| `find-first` | Find first matching agentThread record |
| `get` | Get a agentThread by id |
| `create` | Create a new agentThread |
| `update` | Update an existing agentThread |
| `delete` | Delete a agentThread |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `ownerId` | UUID |
| `status` | String |
| `isArchived` | Boolean |
| `archivedAt` | Datetime |
| `title` | String |
| `mode` | String |
| `model` | String |
| `systemPrompt` | String |
| `tags` | String |
| `promptTemplateId` | UUID |
| `agentId` | UUID |
| `parentThreadId` | UUID |

**Optional create fields (backend defaults):** `ownerId`, `status`, `isArchived`, `archivedAt`, `title`, `mode`, `model`, `systemPrompt`, `tags`, `promptTemplateId`, `agentId`, `parentThreadId`

### `agent-message`

CRUD operations for AgentMessage records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentMessage records |
| `find-first` | Find first matching agentMessage record |
| `get` | Get a agentMessage by id |
| `create` | Create a new agentMessage |
| `update` | Update an existing agentMessage |
| `delete` | Delete a agentMessage |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `actorId` | UUID |
| `parts` | JSON |
| `threadId` | UUID |
| `authorRole` | String |
| `model` | String |
| `agentId` | UUID |

**Required create fields:** `threadId`, `authorRole`
**Optional create fields (backend defaults):** `actorId`, `parts`, `model`, `agentId`

### `agent-task`

CRUD operations for AgentTask records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentTask records |
| `find-first` | Find first matching agentTask record |
| `get` | Get a agentTask by id |
| `create` | Create a new agentTask |
| `update` | Update an existing agentTask |
| `delete` | Delete a agentTask |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `actorId` | UUID |
| `status` | String |
| `planId` | UUID |
| `description` | String |
| `source` | String |
| `error` | String |
| `orderIndex` | Int |
| `requiresApproval` | Boolean |
| `approvalStatus` | String |
| `approvedBy` | UUID |
| `approvedAt` | Datetime |
| `approvalFeedback` | String |

**Required create fields:** `planId`, `description`
**Optional create fields (backend defaults):** `actorId`, `status`, `source`, `error`, `orderIndex`, `requiresApproval`, `approvalStatus`, `approvedBy`, `approvedAt`, `approvalFeedback`

### `agent-prompt`

CRUD operations for AgentPrompt records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentPrompt records |
| `find-first` | Find first matching agentPrompt record |
| `get` | Get a agentPrompt by id |
| `create` | Create a new agentPrompt |
| `update` | Update an existing agentPrompt |
| `delete` | Delete a agentPrompt |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `name` | String |
| `content` | String |
| `description` | String |
| `isDefault` | Boolean |
| `metadata` | JSON |

**Required create fields:** `name`, `content`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `description`, `isDefault`, `metadata`

### `agent-resource-chunk`

CRUD operations for AgentResourceChunk records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentResourceChunk records |
| `find-first` | Find first matching agentResourceChunk record |
| `search <query>` | Search agentResourceChunk records |
| `get` | Get a agentResourceChunk by id |
| `create` | Create a new agentResourceChunk |
| `update` | Update an existing agentResourceChunk |
| `delete` | Delete a agentResourceChunk |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `agentResourceId` | UUID |
| `body` | String |
| `chunkIndex` | Int |
| `embedding` | Vector |
| `metadata` | JSON |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `embeddingVectorDistance` | Float |
| `searchScore` | Float |

**Required create fields:** `agentResourceId`, `body`
**Optional create fields (backend defaults):** `chunkIndex`, `embedding`, `metadata`
> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

> **Unified Search API fields:** `searchScore`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

**Search Examples:**

*Vector similarity search via `embedding` (manual vector):*
```bash
# Pass a pre-computed vector array via dot-notation
csdk agent-resource-chunk list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

*Vector semantic search via `embedding` with --auto-embed:*
```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

*Create/update with auto-embedded `embedding` via --auto-embed:*
```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk agent-resource-chunk update --embedding "new text to embed" --auto-embed
```

*Search with pagination and field projection:*
```bash
csdk agent-resource-chunk list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-resource-chunk search "query" --limit 10 --select id,title,searchScore
```


### `agent-persona`

CRUD operations for AgentPersona records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentPersona records |
| `find-first` | Find first matching agentPersona record |
| `get` | Get a agentPersona by id |
| `create` | Create a new agentPersona |
| `update` | Update an existing agentPersona |
| `delete` | Delete a agentPersona |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `slug` | String |
| `name` | String |
| `description` | String |
| `systemPrompt` | String |
| `resources` | String |
| `config` | JSON |
| `isActive` | Boolean |

**Required create fields:** `slug`, `name`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `description`, `systemPrompt`, `resources`, `config`, `isActive`

### `agent-resource`

CRUD operations for AgentResource records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all agentResource records |
| `find-first` | Find first matching agentResource record |
| `search <query>` | Search agentResource records |
| `get` | Get a agentResource by id |
| `create` | Create a new agentResource |
| `update` | Update an existing agentResource |
| `delete` | Delete a agentResource |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `createdAt` | Datetime |
| `updatedAt` | Datetime |
| `createdBy` | UUID |
| `updatedBy` | UUID |
| `slug` | String |
| `kind` | String |
| `title` | String |
| `description` | String |
| `body` | String |
| `keywords` | String |
| `isActive` | Boolean |
| `metadata` | JSON |
| `isArchived` | Boolean |
| `archivedAt` | Datetime |
| `search` | FullText |
| `embedding` | Vector |
| `embeddingUpdatedAt` | Datetime |
| `searchTsvRank` | Float |
| `embeddingVectorDistance` | Float |
| `kindTrgmSimilarity` | Float |
| `titleTrgmSimilarity` | Float |
| `descriptionTrgmSimilarity` | Float |
| `bodyTrgmSimilarity` | Float |
| `searchScore` | Float |

**Required create fields:** `slug`, `title`, `body`
**Optional create fields (backend defaults):** `createdBy`, `updatedBy`, `kind`, `description`, `keywords`, `isActive`, `metadata`, `isArchived`, `archivedAt`, `embedding`, `embeddingUpdatedAt`
> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

> **Unified Search API fields:** `search`, `kindTrgmSimilarity`, `titleTrgmSimilarity`, `descriptionTrgmSimilarity`, `bodyTrgmSimilarity`, `searchScore`
> Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

**Search Examples:**

*Vector similarity search via `embedding` (manual vector):*
```bash
# Pass a pre-computed vector array via dot-notation
csdk agent-resource list --where.embedding.vector '[0.1,0.2,0.3]' --where.embedding.distance 1.0 --select title,embeddingVectorDistance
```

*Vector semantic search via `embedding` with --auto-embed:*
```bash
# --auto-embed converts text to vectors using the configured embedder (e.g. Ollama nomic-embed-text)
EMBEDDER_PROVIDER=ollama csdk agent-resource search "semantic query" --auto-embed --select title,embeddingVectorDistance
EMBEDDER_PROVIDER=ollama csdk agent-resource list --where.embedding.vector "semantic query" --auto-embed --select title,embeddingVectorDistance
```

*Create/update with auto-embedded `embedding` via --auto-embed:*
```bash
# --auto-embed on create/update converts text strings in vector fields to embeddings before saving
EMBEDDER_PROVIDER=ollama csdk agent-resource create --embedding "text to embed" --auto-embed
EMBEDDER_PROVIDER=ollama csdk agent-resource update --embedding "new text to embed" --auto-embed
```

*Full-text search via tsvector (`search`):*
```bash
csdk agent-resource list --where.search "search query" --select title,tsvRank
```

*Fuzzy search via trigram similarity (`trgmKind`):*
```bash
csdk agent-resource list --where.trgmKind.value "approximate query" --where.trgmKind.threshold 0.3 --select title,kindTrgmSimilarity
```

*Fuzzy search via trigram similarity (`trgmTitle`):*
```bash
csdk agent-resource list --where.trgmTitle.value "approximate query" --where.trgmTitle.threshold 0.3 --select title,titleTrgmSimilarity
```

*Fuzzy search via trigram similarity (`trgmDescription`):*
```bash
csdk agent-resource list --where.trgmDescription.value "approximate query" --where.trgmDescription.threshold 0.3 --select title,descriptionTrgmSimilarity
```

*Fuzzy search via trigram similarity (`trgmBody`):*
```bash
csdk agent-resource list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

*Composite search (unifiedSearch dispatches to all text adapters):*
```bash
csdk agent-resource list --where.unifiedSearch "search query" --select title,tsvRank,kindTrgmSimilarity,titleTrgmSimilarity,descriptionTrgmSimilarity,bodyTrgmSimilarity,searchScore
```

*Search with pagination and field projection:*
```bash
csdk agent-resource list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-resource search "query" --limit 10 --select id,title,searchScore
```


## Custom Operations

### `provision-bucket`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.bucketKey` | String (required) |
  | `--input.ownerId` | UUID |

## Output

All commands output JSON to stdout. Pipe to `jq` for formatting:

```bash
csdk car list | jq '.[]'
csdk car get --id <uuid> | jq '.'
```

## Non-Interactive Mode

Use `--no-tty` to skip all interactive prompts (useful for scripts and CI):

```bash
csdk --no-tty car create --name "Sedan" --year 2024
```

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
