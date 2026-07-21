# platformNamespaceEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformNamespaceEvent records via csdk CLI

## Usage

```bash
csdk platform-namespace-event list
csdk platform-namespace-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-namespace-event list --limit 10 --after <cursor>
csdk platform-namespace-event find-first --where.<field>.<op> <value>
csdk platform-namespace-event get --id <UUID>
csdk platform-namespace-event create --eventType <String> --namespaceId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-namespace-event update --id <UUID> [--actorId <UUID>] [--eventType <String>] [--message <String>] [--metadata <JSON>] [--namespaceId <UUID>]
csdk platform-namespace-event delete --id <UUID>
```

## Examples

### List platformNamespaceEvent records

```bash
csdk platform-namespace-event list
```

### List platformNamespaceEvent records with pagination

```bash
csdk platform-namespace-event list --limit 10 --offset 0
```

### List platformNamespaceEvent records with cursor pagination

```bash
csdk platform-namespace-event list --limit 10 --after <cursor>
```

### Find first matching platformNamespaceEvent

```bash
csdk platform-namespace-event find-first --where.id.equalTo <value>
```

### List platformNamespaceEvent records with field selection

```bash
csdk platform-namespace-event list --select id,id
```

### List platformNamespaceEvent records with filtering and ordering

```bash
csdk platform-namespace-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformNamespaceEvent

```bash
csdk platform-namespace-event create --eventType <String> --namespaceId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a platformNamespaceEvent by id

```bash
csdk platform-namespace-event get --id <value>
```
