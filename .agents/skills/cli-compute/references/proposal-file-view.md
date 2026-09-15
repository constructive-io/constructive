# proposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ProposalFileView records via csdk CLI

## Usage

```bash
csdk proposal-file-view list
csdk proposal-file-view list --where.<field>.<op> <value> --orderBy <values>
csdk proposal-file-view list --limit 10 --after <cursor>
csdk proposal-file-view find-first --where.<field>.<op> <value>
csdk proposal-file-view get --id <UUID>
csdk proposal-file-view create --blobSha <String> --databaseId <UUID> --path <String> --proposalId <UUID> --reviewerId <UUID> [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
csdk proposal-file-view update --id <UUID> [--blobSha <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--path <String>] [--proposalId <UUID>] [--reviewerId <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
csdk proposal-file-view delete --id <UUID>
```

## Examples

### List proposalFileView records

```bash
csdk proposal-file-view list
```

### List proposalFileView records with pagination

```bash
csdk proposal-file-view list --limit 10 --offset 0
```

### List proposalFileView records with cursor pagination

```bash
csdk proposal-file-view list --limit 10 --after <cursor>
```

### Find first matching proposalFileView

```bash
csdk proposal-file-view find-first --where.id.equalTo <value>
```

### List proposalFileView records with field selection

```bash
csdk proposal-file-view list --select id,id
```

### List proposalFileView records with filtering and ordering

```bash
csdk proposal-file-view list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a proposalFileView

```bash
csdk proposal-file-view create --blobSha <String> --databaseId <UUID> --path <String> --proposalId <UUID> --reviewerId <UUID> [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
```

### Get a proposalFileView by id

```bash
csdk proposal-file-view get --id <value>
```
