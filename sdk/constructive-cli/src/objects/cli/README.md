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
| `get-all-record` | getAllRecord CRUD operations |
| `object` | object CRUD operations |
| `ref` | ref CRUD operations |
| `store` | store CRUD operations |
| `commit` | commit CRUD operations |
| `rev-parse` | revParse |
| `get-all-objects-from-root` | Reads and enables pagination through a set of `Object`. |
| `get-path-objects-from-root` | Reads and enables pagination through a set of `Object`. |
| `get-object-at-path` | getObjectAtPath |
| `freeze-objects` | freezeObjects |
| `init-empty-repo` | initEmptyRepo |
| `remove-node-at-path` | removeNodeAtPath |
| `set-data-at-path` | setDataAtPath |
| `set-props-and-commit` | setPropsAndCommit |
| `insert-node-at-path` | insertNodeAtPath |
| `update-node-at-path` | updateNodeAtPath |
| `set-and-commit` | setAndCommit |

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

## Table Commands

### `get-all-record`

CRUD operations for GetAllRecord records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all getAllRecord records |
| `get` | Get a getAllRecord by id |
| `create` | Create a new getAllRecord |
| `update` | Update an existing getAllRecord |
| `delete` | Delete a getAllRecord |

**Fields:**

| Field | Type |
|-------|------|
| `path` | String |
| `data` | JSON |

**Required create fields:** `path`, `data`

### `object`

CRUD operations for Object records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all object records |
| `get` | Get a object by id |
| `create` | Create a new object |
| `update` | Update an existing object |
| `delete` | Delete a object |

**Fields:**

| Field | Type |
|-------|------|
| `hashUuid` | UUID |
| `id` | UUID |
| `databaseId` | UUID |
| `kids` | UUID |
| `ktree` | String |
| `data` | JSON |
| `frzn` | Boolean |
| `createdAt` | Datetime |

**Required create fields:** `hashUuid`, `databaseId`
**Optional create fields (backend defaults):** `kids`, `ktree`, `data`, `frzn`

### `ref`

CRUD operations for Ref records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all ref records |
| `get` | Get a ref by id |
| `create` | Create a new ref |
| `update` | Update an existing ref |
| `delete` | Delete a ref |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `storeId` | UUID |
| `commitId` | UUID |

**Required create fields:** `name`, `databaseId`, `storeId`
**Optional create fields (backend defaults):** `commitId`

### `store`

CRUD operations for Store records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all store records |
| `get` | Get a store by id |
| `create` | Create a new store |
| `update` | Update an existing store |
| `delete` | Delete a store |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `name` | String |
| `databaseId` | UUID |
| `hash` | UUID |
| `createdAt` | Datetime |

**Required create fields:** `name`, `databaseId`
**Optional create fields (backend defaults):** `hash`

### `commit`

CRUD operations for Commit records.

| Subcommand | Description |
|------------|-------------|
| `list` | List all commit records |
| `get` | Get a commit by id |
| `create` | Create a new commit |
| `update` | Update an existing commit |
| `delete` | Delete a commit |

**Fields:**

| Field | Type |
|-------|------|
| `id` | UUID |
| `message` | String |
| `databaseId` | UUID |
| `storeId` | UUID |
| `parentIds` | UUID |
| `authorId` | UUID |
| `committerId` | UUID |
| `treeId` | UUID |
| `date` | Datetime |

**Required create fields:** `databaseId`, `storeId`
**Optional create fields (backend defaults):** `message`, `parentIds`, `authorId`, `committerId`, `treeId`, `date`

## Custom Operations

### `rev-parse`

revParse

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--dbId` | UUID |
  | `--storeId` | UUID |
  | `--refname` | String |

### `get-all-objects-from-root`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--id` | UUID |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `get-path-objects-from-root`

Reads and enables pagination through a set of `Object`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--databaseId` | UUID |
  | `--id` | UUID |
  | `--path` | String |
  | `--first` | Int |
  | `--offset` | Int |
  | `--after` | Cursor |

### `get-object-at-path`

getObjectAtPath

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--dbId` | UUID |
  | `--storeId` | UUID |
  | `--path` | String |
  | `--refname` | String |

### `freeze-objects`

freezeObjects

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.databaseId` | UUID |
  | `--input.id` | UUID |

### `init-empty-repo`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |

### `remove-node-at-path`

removeNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |

### `set-data-at-path`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |

### `set-props-and-commit`

setPropsAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |
  | `--input.refname` | String |
  | `--input.path` | String |
  | `--input.data` | JSON |

### `insert-node-at-path`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

### `update-node-at-path`

updateNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.root` | UUID |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

### `set-and-commit`

setAndCommit

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `--input.clientMutationId` | String |
  | `--input.dbId` | UUID |
  | `--input.storeId` | UUID |
  | `--input.refname` | String |
  | `--input.path` | String |
  | `--input.data` | JSON |
  | `--input.kids` | UUID |
  | `--input.ktree` | String |

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
