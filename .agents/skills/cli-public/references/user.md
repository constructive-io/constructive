# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for User records via csdk CLI

**Unified Search API fields:** `searchTsv`, `displayNameTrgmSimilarity`, `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk user list
csdk user list --where.<field>.<op> <value> --orderBy <values>
csdk user list --limit 10 --after <cursor>
csdk user find-first --where.<field>.<op> <value>
csdk user search <query>
csdk user get --id <UUID>
csdk user create [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
csdk user update --id <UUID> [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
csdk user delete --id <UUID>
```

## Examples

### List user records

```bash
csdk user list
```

### List user records with pagination

```bash
csdk user list --limit 10 --offset 0
```

### List user records with cursor pagination

```bash
csdk user list --limit 10 --after <cursor>
```

### Find first matching user

```bash
csdk user find-first --where.id.equalTo <value>
```

### List user records with field selection

```bash
csdk user list --select id,id
```

### List user records with filtering and ordering

```bash
csdk user list --where.id.equalTo <value> --orderBy ID_ASC
```

### Full-text search via tsvector (`searchTsv`)

```bash
csdk user list --where.searchTsv "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmDisplayName`)

```bash
csdk user list --where.trgmDisplayName.value "approximate query" --where.trgmDisplayName.threshold 0.3 --select title,displayNameTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk user list --where.unifiedSearch "search query" --select title,tsvRank,displayNameTrgmSimilarity,searchScore
```

### Search with pagination and field projection

```bash
csdk user list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk user search "query" --limit 10 --select id,title,searchScore
```

### Create a user

```bash
csdk user create [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
```

### Get a user by id

```bash
csdk user get --id <value>
```
