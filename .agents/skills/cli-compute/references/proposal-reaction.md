# proposalReaction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ProposalReaction records via csdk CLI

## Usage

```bash
csdk proposal-reaction list
csdk proposal-reaction list --where.<field>.<op> <value> --orderBy <values>
csdk proposal-reaction list --limit 10 --after <cursor>
csdk proposal-reaction find-first --where.<field>.<op> <value>
csdk proposal-reaction get --id <UUID>
csdk proposal-reaction create --actorId <UUID> --databaseId <UUID> --emoji <String> --proposalId <UUID> [--commentId <UUID>] [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>]
csdk proposal-reaction update --id <UUID> [--actorId <UUID>] [--commentId <UUID>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--emoji <String>] [--proposalId <UUID>] [--updatedByPrincipal <UUID>]
csdk proposal-reaction delete --id <UUID>
```

## Examples

### List proposalReaction records

```bash
csdk proposal-reaction list
```

### List proposalReaction records with pagination

```bash
csdk proposal-reaction list --limit 10 --offset 0
```

### List proposalReaction records with cursor pagination

```bash
csdk proposal-reaction list --limit 10 --after <cursor>
```

### Find first matching proposalReaction

```bash
csdk proposal-reaction find-first --where.id.equalTo <value>
```

### List proposalReaction records with field selection

```bash
csdk proposal-reaction list --select id,id
```

### List proposalReaction records with filtering and ordering

```bash
csdk proposal-reaction list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a proposalReaction

```bash
csdk proposal-reaction create --actorId <UUID> --databaseId <UUID> --emoji <String> --proposalId <UUID> [--commentId <UUID>] [--createdByPrincipal <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a proposalReaction by id

```bash
csdk proposal-reaction get --id <value>
```
