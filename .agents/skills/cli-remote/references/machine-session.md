# machineSession

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for MachineSession records via csdk CLI

## Usage

```bash
csdk machine-session list
csdk machine-session list --where.<field>.<op> <value> --orderBy <values>
csdk machine-session list --limit 10 --after <cursor>
csdk machine-session find-first --where.<field>.<op> <value>
csdk machine-session get --id <UUID>
csdk machine-session create --entityId <UUID> --machineId <UUID> --ownerId <UUID> [--agentMode <String>] [--agentSessionRef <String>] [--args <String>] [--cols <Int>] [--command <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--cwd <String>] [--endedAt <Datetime>] [--env <JSON>] [--exitCode <Int>] [--interactive <Boolean>] [--lastActivityAt <Datetime>] [--lastSeq <BigInt>] [--metadata <JSON>] [--pid <Int>] [--runId <UUID>] [--startedAt <Datetime>] [--state <String>] [--termRows <Int>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk machine-session update --id <UUID> [--agentMode <String>] [--agentSessionRef <String>] [--args <String>] [--cols <Int>] [--command <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--cwd <String>] [--endedAt <Datetime>] [--entityId <UUID>] [--env <JSON>] [--exitCode <Int>] [--interactive <Boolean>] [--lastActivityAt <Datetime>] [--lastSeq <BigInt>] [--machineId <UUID>] [--metadata <JSON>] [--ownerId <UUID>] [--pid <Int>] [--runId <UUID>] [--startedAt <Datetime>] [--state <String>] [--termRows <Int>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk machine-session delete --id <UUID>
```

## Examples

### List machineSession records

```bash
csdk machine-session list
```

### List machineSession records with pagination

```bash
csdk machine-session list --limit 10 --offset 0
```

### List machineSession records with cursor pagination

```bash
csdk machine-session list --limit 10 --after <cursor>
```

### Find first matching machineSession

```bash
csdk machine-session find-first --where.id.equalTo <value>
```

### List machineSession records with field selection

```bash
csdk machine-session list --select id,id
```

### List machineSession records with filtering and ordering

```bash
csdk machine-session list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a machineSession

```bash
csdk machine-session create --entityId <UUID> --machineId <UUID> --ownerId <UUID> [--agentMode <String>] [--agentSessionRef <String>] [--args <String>] [--cols <Int>] [--command <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--cwd <String>] [--endedAt <Datetime>] [--env <JSON>] [--exitCode <Int>] [--interactive <Boolean>] [--lastActivityAt <Datetime>] [--lastSeq <BigInt>] [--metadata <JSON>] [--pid <Int>] [--runId <UUID>] [--startedAt <Datetime>] [--state <String>] [--termRows <Int>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a machineSession by id

```bash
csdk machine-session get --id <value>
```
