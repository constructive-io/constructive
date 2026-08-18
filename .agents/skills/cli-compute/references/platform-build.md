# platformBuild

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformBuild records via csdk CLI

## Usage

```bash
csdk platform-build list
csdk platform-build list --where.<field>.<op> <value> --orderBy <values>
csdk platform-build list --limit 10 --after <cursor>
csdk platform-build find-first --where.<field>.<op> <value>
csdk platform-build get --id <UUID>
csdk platform-build create --repositoryId <UUID> [--actorId <UUID>] [--catalogImageId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--jobId <BigInt>] [--logs <Upload>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
csdk platform-build update --id <UUID> [--actorId <UUID>] [--catalogImageId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--jobId <BigInt>] [--logs <Upload>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--repositoryId <UUID>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
csdk platform-build delete --id <UUID>
```

## Examples

### List platformBuild records

```bash
csdk platform-build list
```

### List platformBuild records with pagination

```bash
csdk platform-build list --limit 10 --offset 0
```

### List platformBuild records with cursor pagination

```bash
csdk platform-build list --limit 10 --after <cursor>
```

### Find first matching platformBuild

```bash
csdk platform-build find-first --where.id.equalTo <value>
```

### List platformBuild records with field selection

```bash
csdk platform-build list --select id,id
```

### List platformBuild records with filtering and ordering

```bash
csdk platform-build list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformBuild

```bash
csdk platform-build create --repositoryId <UUID> [--actorId <UUID>] [--catalogImageId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--eventId <UUID>] [--finishedAt <Datetime>] [--jobId <BigInt>] [--logs <Upload>] [--metadata <JSON>] [--proposalId <UUID>] [--ref <String>] [--startedAt <Datetime>] [--status <String>] [--updatedByPrincipal <UUID>] [--workflowId <UUID>]
```

### Get a platformBuild by id

```bash
csdk platform-build get --id <value>
```
