# platformProposalReview

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposalReview records via csdk CLI

**Unified Search API fields:** `bodyTrgmSimilarity`, `commitShaTrgmSimilarity`, `search`, `searchScore`, `verdictTrgmSimilarity`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk platform-proposal-review list
csdk platform-proposal-review list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposal-review list --limit 10 --after <cursor>
csdk platform-proposal-review find-first --where.<field>.<op> <value>
csdk platform-proposal-review search <query>
csdk platform-proposal-review get --id <UUID>
csdk platform-proposal-review create --commitSha <String> --proposalId <UUID> --reviewerId <UUID> --verdict <String> [--body <String>] [--createdByPrincipal <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>]
csdk platform-proposal-review update --id <UUID> [--body <String>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--proposalId <UUID>] [--reviewerId <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>] [--verdict <String>]
csdk platform-proposal-review delete --id <UUID>
```

## Examples

### List platformProposalReview records

```bash
csdk platform-proposal-review list
```

### List platformProposalReview records with pagination

```bash
csdk platform-proposal-review list --limit 10 --offset 0
```

### List platformProposalReview records with cursor pagination

```bash
csdk platform-proposal-review list --limit 10 --after <cursor>
```

### Find first matching platformProposalReview

```bash
csdk platform-proposal-review find-first --where.id.equalTo <value>
```

### List platformProposalReview records with field selection

```bash
csdk platform-proposal-review list --select id,id
```

### List platformProposalReview records with filtering and ordering

```bash
csdk platform-proposal-review list --where.id.equalTo <value> --orderBy ID_ASC
```

### Fuzzy search via trigram similarity (`trgmBody`)

```bash
csdk platform-proposal-review list --where.trgmBody.value "approximate query" --where.trgmBody.threshold 0.3 --select title,bodyTrgmSimilarity
```

### Fuzzy search via trigram similarity (`trgmCommitSha`)

```bash
csdk platform-proposal-review list --where.trgmCommitSha.value "approximate query" --where.trgmCommitSha.threshold 0.3 --select title,commitShaTrgmSimilarity
```

### Full-text search via tsvector (`search`)

```bash
csdk platform-proposal-review list --where.search "search query" --select title,tsvRank
```

### Fuzzy search via trigram similarity (`trgmVerdict`)

```bash
csdk platform-proposal-review list --where.trgmVerdict.value "approximate query" --where.trgmVerdict.threshold 0.3 --select title,verdictTrgmSimilarity
```

### Composite search (unifiedSearch dispatches to all text adapters)

```bash
csdk platform-proposal-review list --where.unifiedSearch "search query" --select title,bodyTrgmSimilarity,commitShaTrgmSimilarity,tsvRank,searchScore,verdictTrgmSimilarity
```

### Search with pagination and field projection

```bash
csdk platform-proposal-review list --where.unifiedSearch "query" --limit 10 --select id,title,searchScore
csdk platform-proposal-review search "query" --limit 10 --select id,title,searchScore
```

### Create a platformProposalReview

```bash
csdk platform-proposal-review create --commitSha <String> --proposalId <UUID> --reviewerId <UUID> --verdict <String> [--body <String>] [--createdByPrincipal <UUID>] [--submittedAt <Datetime>] [--updatedByPrincipal <UUID>]
```

### Get a platformProposalReview by id

```bash
csdk platform-proposal-review get --id <value>
```
