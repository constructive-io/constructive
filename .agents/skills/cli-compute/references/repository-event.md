# repositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RepositoryEvent records via csdk CLI

## Usage

```bash
csdk repository-event list
csdk repository-event list --where.<field>.<op> <value> --orderBy <values>
csdk repository-event list --limit 10 --after <cursor>
csdk repository-event find-first --where.<field>.<op> <value>
csdk repository-event get --id <UUID>
csdk repository-event create --databaseId <UUID> --eventType <String> --repositoryId <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--deliveryId <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--updatedByPrincipal <UUID>]
csdk repository-event update --id <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--databaseId <UUID>] [--deliveryId <String>] [--eventType <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--repositoryId <UUID>] [--updatedByPrincipal <UUID>]
csdk repository-event delete --id <UUID>
```

## Examples

### List repositoryEvent records

```bash
csdk repository-event list
```

### List repositoryEvent records with pagination

```bash
csdk repository-event list --limit 10 --offset 0
```

### List repositoryEvent records with cursor pagination

```bash
csdk repository-event list --limit 10 --after <cursor>
```

### Find first matching repositoryEvent

```bash
csdk repository-event find-first --where.id.equalTo <value>
```

### List repositoryEvent records with field selection

```bash
csdk repository-event list --select id,id
```

### List repositoryEvent records with filtering and ordering

```bash
csdk repository-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a repositoryEvent

```bash
csdk repository-event create --databaseId <UUID> --eventType <String> --repositoryId <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--deliveryId <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--updatedByPrincipal <UUID>]
```

### Get a repositoryEvent by id

```bash
csdk repository-event get --id <value>
```
