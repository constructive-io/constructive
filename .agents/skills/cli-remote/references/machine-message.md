# machineMessage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MachineMessage records via csdk CLI

## Usage

```bash
csdk machine-message list
csdk machine-message list --where.<field>.<op> <value> --orderBy <values>
csdk machine-message list --limit 10 --after <cursor>
csdk machine-message find-first --where.<field>.<op> <value>
csdk machine-message get --id <UUID>
csdk machine-message create --actorId <UUID> --entityId <UUID> --kind <String> --ownerId <UUID> --seq <BigInt> --sessionId <UUID> [--content <JSON>] [--createdByPrincipal <UUID>] [--recordedAt <Datetime>]
csdk machine-message update --id <UUID> [--actorId <UUID>] [--content <JSON>] [--createdByPrincipal <UUID>] [--entityId <UUID>] [--kind <String>] [--ownerId <UUID>] [--recordedAt <Datetime>] [--seq <BigInt>] [--sessionId <UUID>]
csdk machine-message delete --id <UUID>
```

## Examples

### List machineMessage records

```bash
csdk machine-message list
```

### List machineMessage records with pagination

```bash
csdk machine-message list --limit 10 --offset 0
```

### List machineMessage records with cursor pagination

```bash
csdk machine-message list --limit 10 --after <cursor>
```

### Find first matching machineMessage

```bash
csdk machine-message find-first --where.id.equalTo <value>
```

### List machineMessage records with field selection

```bash
csdk machine-message list --select id,id
```

### List machineMessage records with filtering and ordering

```bash
csdk machine-message list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a machineMessage

```bash
csdk machine-message create --actorId <UUID> --entityId <UUID> --kind <String> --ownerId <UUID> --seq <BigInt> --sessionId <UUID> [--content <JSON>] [--createdByPrincipal <UUID>] [--recordedAt <Datetime>]
```

### Get a machineMessage by id

```bash
csdk machine-message get --id <value>
```
