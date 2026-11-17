# buildStep

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BuildStep records via csdk CLI

## Usage

```bash
csdk build-step list
csdk build-step list --where.<field>.<op> <value> --orderBy <values>
csdk build-step list --limit 10 --after <cursor>
csdk build-step find-first --where.<field>.<op> <value>
csdk build-step get --id <UUID>
csdk build-step create --buildId <UUID> --databaseId <UUID> --name <String> --seq <Int> [--createdByPrincipal <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
csdk build-step update --id <UUID> [--buildId <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--name <String>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--seq <Int>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
csdk build-step delete --id <UUID>
```

## Examples

### List buildStep records

```bash
csdk build-step list
```

### List buildStep records with pagination

```bash
csdk build-step list --limit 10 --offset 0
```

### List buildStep records with cursor pagination

```bash
csdk build-step list --limit 10 --after <cursor>
```

### Find first matching buildStep

```bash
csdk build-step find-first --where.id.equalTo <value>
```

### List buildStep records with field selection

```bash
csdk build-step list --select id,id
```

### List buildStep records with filtering and ordering

```bash
csdk build-step list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a buildStep

```bash
csdk build-step create --buildId <UUID> --databaseId <UUID> --name <String> --seq <Int> [--createdByPrincipal <UUID>] [--exitCode <Int>] [--finishedAt <Datetime>] [--kind <String>] [--logBytes <BigInt>] [--logOffset <BigInt>] [--parentSeq <Int>] [--recordedAt <Datetime>] [--startedAt <Datetime>] [--status <String>] [--summary <JSON>]
```

### Get a buildStep by id

```bash
csdk build-step get --id <value>
```
