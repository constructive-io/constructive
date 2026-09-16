# platformRepositoryEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformRepositoryEvent records via csdk CLI

## Usage

```bash
csdk platform-repository-event list
csdk platform-repository-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-repository-event list --limit 10 --after <cursor>
csdk platform-repository-event find-first --where.<field>.<op> <value>
csdk platform-repository-event get --id <UUID>
csdk platform-repository-event create --eventType <String> --repositoryId <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--deliveryId <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--updatedByPrincipal <UUID>]
csdk platform-repository-event update --id <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--deliveryId <String>] [--eventType <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--repositoryId <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-repository-event delete --id <UUID>
```

## Examples

### List platformRepositoryEvent records

```bash
csdk platform-repository-event list
```

### List platformRepositoryEvent records with pagination

```bash
csdk platform-repository-event list --limit 10 --offset 0
```

### List platformRepositoryEvent records with cursor pagination

```bash
csdk platform-repository-event list --limit 10 --after <cursor>
```

### Find first matching platformRepositoryEvent

```bash
csdk platform-repository-event find-first --where.id.equalTo <value>
```

### List platformRepositoryEvent records with field selection

```bash
csdk platform-repository-event list --select id,id
```

### List platformRepositoryEvent records with filtering and ordering

```bash
csdk platform-repository-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformRepositoryEvent

```bash
csdk platform-repository-event create --eventType <String> --repositoryId <UUID> [--actorId <UUID>] [--commitSha <String>] [--createdByPrincipal <UUID>] [--deliveryId <String>] [--metadata <JSON>] [--payload <JSON>] [--ref <String>] [--updatedByPrincipal <UUID>]
```

### Get a platformRepositoryEvent by id

```bash
csdk platform-repository-event get --id <value>
```
