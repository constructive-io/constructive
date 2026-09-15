# build

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Build records via csdk CLI

## Usage

```bash
csdk build list
csdk build list --where.<field>.<op> <value> --orderBy <values>
csdk build list --limit 10 --after <cursor>
csdk build find-first --where.<field>.<op> <value>
csdk build get --id <UUID>
csdk build create --databaseId <UUID> --repositoryId <UUID> [--actorId <UUID>] [--attempt <Int>] [--commitSha <String>] [--conclusion <String>] [--createdByPrincipal <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--imageRef <String>] [--jobId <BigInt>] [--logs <Upload>] [--matrixKey <String>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
csdk build update --id <UUID> [--actorId <UUID>] [--attempt <Int>] [--commitSha <String>] [--conclusion <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--imageRef <String>] [--jobId <BigInt>] [--logs <Upload>] [--matrixKey <String>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--repositoryId <UUID>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
csdk build delete --id <UUID>
```

## Examples

### List build records

```bash
csdk build list
```

### List build records with pagination

```bash
csdk build list --limit 10 --offset 0
```

### List build records with cursor pagination

```bash
csdk build list --limit 10 --after <cursor>
```

### Find first matching build

```bash
csdk build find-first --where.id.equalTo <value>
```

### List build records with field selection

```bash
csdk build list --select id,id
```

### List build records with filtering and ordering

```bash
csdk build list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a build

```bash
csdk build create --databaseId <UUID> --repositoryId <UUID> [--actorId <UUID>] [--attempt <Int>] [--commitSha <String>] [--conclusion <String>] [--createdByPrincipal <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--imageRef <String>] [--jobId <BigInt>] [--logs <Upload>] [--matrixKey <String>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
```

### Get a build by id

```bash
csdk build get --id <value>
```
