# platformProposalFileView

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposalFileView records via csdk CLI

## Usage

```bash
csdk platform-proposal-file-view list
csdk platform-proposal-file-view list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposal-file-view list --limit 10 --after <cursor>
csdk platform-proposal-file-view find-first --where.<field>.<op> <value>
csdk platform-proposal-file-view get --id <UUID>
csdk platform-proposal-file-view create --blobSha <String> --path <String> --proposalId <UUID> --reviewerId <UUID> [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
csdk platform-proposal-file-view update --id <UUID> [--blobSha <String>] [--createdByPrincipal <UUID>] [--path <String>] [--proposalId <UUID>] [--reviewerId <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
csdk platform-proposal-file-view delete --id <UUID>
```

## Examples

### List platformProposalFileView records

```bash
csdk platform-proposal-file-view list
```

### List platformProposalFileView records with pagination

```bash
csdk platform-proposal-file-view list --limit 10 --offset 0
```

### List platformProposalFileView records with cursor pagination

```bash
csdk platform-proposal-file-view list --limit 10 --after <cursor>
```

### Find first matching platformProposalFileView

```bash
csdk platform-proposal-file-view find-first --where.id.equalTo <value>
```

### List platformProposalFileView records with field selection

```bash
csdk platform-proposal-file-view list --select id,id
```

### List platformProposalFileView records with filtering and ordering

```bash
csdk platform-proposal-file-view list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformProposalFileView

```bash
csdk platform-proposal-file-view create --blobSha <String> --path <String> --proposalId <UUID> --reviewerId <UUID> [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>] [--viewedAt <Datetime>]
```

### Get a platformProposalFileView by id

```bash
csdk platform-proposal-file-view get --id <value>
```
