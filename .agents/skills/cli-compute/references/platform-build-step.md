# platformBuildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformBuildStep records via csdk CLI

## Usage

```bash
csdk platform-build-step list
csdk platform-build-step list --where.<field>.<op> <value> --orderBy <values>
csdk platform-build-step list --limit 10 --after <cursor>
csdk platform-build-step find-first --where.<field>.<op> <value>
csdk platform-build-step get --id <UUID>
csdk platform-build-step create --buildId <UUID> --name <String> --seq <Int> [--createdByPrincipal <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
csdk platform-build-step update --id <UUID> [--buildId <UUID>] [--createdByPrincipal <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--name <String>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--seq <Int>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
csdk platform-build-step delete --id <UUID>
```

## Examples

### List platformBuildStep records

```bash
csdk platform-build-step list
```

### List platformBuildStep records with pagination

```bash
csdk platform-build-step list --limit 10 --offset 0
```

### List platformBuildStep records with cursor pagination

```bash
csdk platform-build-step list --limit 10 --after <cursor>
```

### Find first matching platformBuildStep

```bash
csdk platform-build-step find-first --where.id.equalTo <value>
```

### List platformBuildStep records with field selection

```bash
csdk platform-build-step list --select id,id
```

### List platformBuildStep records with filtering and ordering

```bash
csdk platform-build-step list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformBuildStep

```bash
csdk platform-build-step create --buildId <UUID> --name <String> --seq <Int> [--createdByPrincipal <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
```

### Get a platformBuildStep by id

```bash
csdk platform-build-step get --id <value>
```
