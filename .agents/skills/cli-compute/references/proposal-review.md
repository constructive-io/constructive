# proposalReview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ProposalReview records via csdk CLI

**Unified Search API fields:** `bodyTrgmSimilarity`, `commitShaTrgmSimilarity`, `search`, `searchScore`, `verdictTrgmSimilarity`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk proposal-review list
csdk proposal-review list --where.<field>.<op> <value> --orderBy <values>
csdk proposal-review list --limit 10 --after <cursor>
csdk proposal-review find-first --where.<field>.<op> <value>
csdk proposal-review search <query>
csdk proposal-review get --id <UUID>
csdk proposal-review create --commitSha <String> --databaseId <UUID> --proposalId <UUID> --reviewerId <UUID> --verdict <String> [--body <String>] [--createdByPrincipal <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>]
csdk proposal-review update --id <UUID> [--body <String>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--proposalId <UUID>] [--reviewerId <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>] [--verdict <String>]
csdk proposal-review delete --id <UUID>
```

## Examples

### List proposalReview records

```bash
csdk proposal-review list
```

### List proposalReview records with pagination

```bash
csdk proposal-review list --limit 10 --offset 0
```

### List proposalReview records with cursor pagination

```bash
csdk proposal-review list --limit 10 --after <cursor>
```

### Find first matching proposalReview

```bash
csdk proposal-review find-first --where.id.equalTo <value>
```

### List proposalReview records with field selection

```bash
csdk proposal-review list --select id,id
```

### List proposalReview records with filtering and ordering

```bash
csdk proposal-review list --where.id.equalTo <value> --orderBy ID_ASC
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk proposal-review list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmCommitSha`)

```bash
csdk proposal-review list --where.trgmCommitSha.value "approximate query" --where.trgmCommitSha.threshold 0.3 --select title,commitShaTrgmSimilarity
```

### Full-text search via tsvector (`search`)

```bash
csdk proposal-review list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmVerdict`)

```bash
csdk proposal-review list --where.trgmVerdict.value "approximate query" --where.trgmVerdict.threshold 0.3 --select title,verdictTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk proposal-review list --where.unifiedSearch "search query" --select title,bodyTrgmSimilarity,commitShaTrgmSimilarity,tsvRank,searchScore,verdictTrgmSimilarity
```

### Search with pagination and field projection

```bash
csdk proposal-review list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk proposal-review search "query" --limit 10 --select id,title,searchScore
```

### Create a proposalReview

```bash
csdk proposal-review create --commitSha <String> --databaseId <UUID> --proposalId <UUID> --reviewerId <UUID> --verdict <String> [--body <String>] [--createdByPrincipal <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>]
```

### Get a proposalReview by id

```bash
csdk proposal-review get --id <value>
```
