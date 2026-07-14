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
| `agent` | agent CRUD operations |
| `agent-message` | agentMessage CRUD operations |
| `agent-persona` | agentPersona CRUD operations |
| `agent-plan` | agentPlan CRUD operations |
| `agent-prompt` | agentPrompt CRUD operations |
| `agent-resource-chunk` | agentResourceChunk CRUD operations |
| `agent-resource` | agentResource CRUD operations |
| `agent-task` | agentTask CRUD operations |
| `agent-thread` | agentThread CRUD operations |
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
| `config` | JSON |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `isEphemeral` | Boolean |
| `name` | String |
| `ownerId` | UUID |
| `parentId` | UUID |
| `personaId` | UUID |
| `status` | String |
| `systemPrompt` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `name`
**Optional create fields (backend defaults):** `config`, `isEphemeral`, `ownerId`, `parentId`, `personaId`, `status`, `systemPrompt`

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
| `actorId` | UUID |
| `agentId` | UUID |
| `authorRole` | String |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `model` | String |
| `parts` | JSON |
| `threadId` | UUID |
| `updatedAt` | Datetime |

**Required create fields:** `authorRole`, `databaseId`, `threadId`
**Optional create fields (backend defaults):** `actorId`, `agentId`, `model`, `parts`

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
| `config` | JSON |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `isActive` | Boolean |
| `name` | String |
| `resources` | String |
| `slug` | String |
| `systemPrompt` | String |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `databaseId`, `name`, `slug`
**Optional create fields (backend defaults):** `config`, `createdBy`, `description`, `isActive`, `resources`, `systemPrompt`, `updatedBy`

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
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `ownerId` | UUID |
| `status` | String |
| `threadId` | UUID |
| `title` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `threadId`, `title`
**Optional create fields (backend defaults):** `description`, `ownerId`, `status`

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
| `content` | String |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `description` | String |
| `id` | UUID |
| `isDefault` | Boolean |
| `metadata` | JSON |
| `name` | String |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `content`, `databaseId`, `name`
**Optional create fields (backend defaults):** `createdBy`, `description`, `isDefault`, `metadata`, `updatedBy`

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
| `agentResourceId` | UUID |
| `body` | String |
| `chunkIndex` | Int |
| `createdAt` | Datetime |
| `embedding` | Vector |
| `embeddingVectorDistance` | Float |
| `id` | UUID |
| `metadata` | JSON |
| `searchScore` | Float |
| `updatedAt` | Datetime |

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
| `archivedAt` | Datetime |
| `body` | String |
| `bodyTrgmSimilarity` | Float |
| `createdAt` | Datetime |
| `createdBy` | UUID |
| `databaseId` | UUID |
| `description` | String |
| `descriptionTrgmSimilarity` | Float |
| `embedding` | Vector |
| `embeddingUpdatedAt` | Datetime |
| `embeddingVectorDistance` | Float |
| `id` | UUID |
| `isActive` | Boolean |
| `isArchived` | Boolean |
| `keywords` | String |
| `kind` | String |
| `kindTrgmSimilarity` | Float |
| `metadata` | JSON |
| `search` | FullText |
| `searchScore` | Float |
| `searchTsvRank` | Float |
| `slug` | String |
| `title` | String |
| `titleTrgmSimilarity` | Float |
| `updatedAt` | Datetime |
| `updatedBy` | UUID |

**Required create fields:** `body`, `databaseId`, `slug`, `title`
**Optional create fields (backend defaults):** `archivedAt`, `createdBy`, `description`, `embedding`, `embeddingUpdatedAt`, `isActive`, `isArchived`, `keywords`, `kind`, `metadata`, `updatedBy`
> **pgvector embedding fields:** `embedding`
> High-dimensional vector columns for semantic similarity search. Query via the Unified Search API pgvector adapter using cosine, L2, or inner-product distance. Supports chunk-aware search: set `includeChunks: true` in VectorNearbyInput to transparently query across parent and chunk embeddings, returning the minimum distance.

> **Unified Search API fields:** `bodyTrgmSimilarity`, `descriptionTrgmSimilarity`, `kindTrgmSimilarity`, `search`, `searchScore`, `titleTrgmSimilarity`
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

*Fuzzy search via trigram similarity (`trgmBody`):*
```bash
csdk agent-resource list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

*Fuzzy search via trigram similarity (`trgmDescription`):*
```bash
csdk agent-resource list --where.trgmDescription.value "approximate query" --where.trgmDescription.threshold 0.3 --select title,descriptionTrgmSimilarity
```

*Fuzzy search via trigram similarity (`trgmKind`):*
```bash
csdk agent-resource list --where.trgmKind.value "approximate query" --where.trgmKind.threshold 0.3 --select title,kindTrgmSimilarity
```

*Full-text search via tsvector (`search`):*
```bash
csdk agent-resource list --where.search "search query" --select title,tsvRank
```

*Fuzzy search via trigram similarity (`trgmTitle`):*
```bash
csdk agent-resource list --where.trgmTitle.value "approximate query" --where.trgmTitle.threshold 0.3 --select title,titleTrgmSimilarity
```

*Composite search (unifiedSearch dispatches to all text adapters):*
```bash
csdk agent-resource list --where.unifiedSearch "search query" --select title,bodyTrgmSimilarity,descriptionTrgmSimilarity,kindTrgmSimilarity,tsvRank,searchScore,titleTrgmSimilarity
```

*Search with pagination and field projection:*
```bash
csdk agent-resource list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk agent-resource search "query" --limit 10 --select id,title,searchScore
```


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
| `actorId` | UUID |
| `approvalFeedback` | String |
| `approvalStatus` | String |
| `approvedAt` | Datetime |
| `approvedBy` | UUID |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `description` | String |
| `error` | String |
| `id` | UUID |
| `orderIndex` | Int |
| `planId` | UUID |
| `requiresApproval` | Boolean |
| `source` | String |
| `status` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`, `description`, `planId`
**Optional create fields (backend defaults):** `actorId`, `approvalFeedback`, `approvalStatus`, `approvedAt`, `approvedBy`, `error`, `orderIndex`, `requiresApproval`, `source`, `status`

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
| `agentId` | UUID |
| `archivedAt` | Datetime |
| `createdAt` | Datetime |
| `databaseId` | UUID |
| `id` | UUID |
| `isArchived` | Boolean |
| `mode` | String |
| `model` | String |
| `ownerId` | UUID |
| `parentThreadId` | UUID |
| `promptTemplateId` | UUID |
| `status` | String |
| `systemPrompt` | String |
| `tags` | String |
| `title` | String |
| `updatedAt` | Datetime |

**Required create fields:** `databaseId`
**Optional create fields (backend defaults):** `agentId`, `archivedAt`, `isArchived`, `mode`, `model`, `ownerId`, `parentThreadId`, `promptTemplateId`, `status`, `systemPrompt`, `tags`, `title`

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
