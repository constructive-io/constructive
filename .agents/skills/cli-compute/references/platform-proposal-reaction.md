# platformProposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformProposalReaction records via csdk CLI

## Usage

```bash
csdk platform-proposal-reaction list
csdk platform-proposal-reaction list --where.<field>.<op> <value> --orderBy <values>
csdk platform-proposal-reaction list --limit 10 --after <cursor>
csdk platform-proposal-reaction find-first --where.<field>.<op> <value>
csdk platform-proposal-reaction get --id <UUID>
csdk platform-proposal-reaction create --actorId <UUID> --emoji <String> --proposalId <UUID> [--commentId <UUID>] [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal-reaction update --id <UUID> [--actorId <UUID>] [--commentId <UUID>] [--createdByPrincipal <UUID>] [--emoji <String>] [--proposalId <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-proposal-reaction delete --id <UUID>
```

## Examples

### List platformProposalReaction records

```bash
csdk platform-proposal-reaction list
```

### List platformProposalReaction records with pagination

```bash
csdk platform-proposal-reaction list --limit 10 --offset 0
```

### List platformProposalReaction records with cursor pagination

```bash
csdk platform-proposal-reaction list --limit 10 --after <cursor>
```

### Find first matching platformProposalReaction

```bash
csdk platform-proposal-reaction find-first --where.id.equalTo <value>
```

### List platformProposalReaction records with field selection

```bash
csdk platform-proposal-reaction list --select id,id
```

### List platformProposalReaction records with filtering and ordering

```bash
csdk platform-proposal-reaction list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformProposalReaction

```bash
csdk platform-proposal-reaction create --actorId <UUID> --emoji <String> --proposalId <UUID> [--commentId <UUID>] [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformProposalReaction by id

```bash
csdk platform-proposal-reaction get --id <value>
```
