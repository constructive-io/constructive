# domainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DomainEvent records via csdk CLI

## Usage

```bash
csdk domain-event list
csdk domain-event list --where.<field>.<op> <value> --orderBy <values>
csdk domain-event list --limit 10 --after <cursor>
csdk domain-event find-first --where.<field>.<op> <value>
csdk domain-event get --id <UUID>
csdk domain-event create --eventType <String> --managedDomainId <UUID> --ownerId <UUID> [--actorId <UUID>] [--domainVerificationId <UUID>] [--message <String>] [--metadata <JSON>]
csdk domain-event update --id <UUID> [--actorId <UUID>] [--domainVerificationId <UUID>] [--eventType <String>] [--managedDomainId <UUID>] [--message <String>] [--metadata <JSON>] [--ownerId <UUID>]
csdk domain-event delete --id <UUID>
```

## Examples

### List domainEvent records

```bash
csdk domain-event list
```

### List domainEvent records with pagination

```bash
csdk domain-event list --limit 10 --offset 0
```

### List domainEvent records with cursor pagination

```bash
csdk domain-event list --limit 10 --after <cursor>
```

### Find first matching domainEvent

```bash
csdk domain-event find-first --where.id.equalTo <value>
```

### List domainEvent records with field selection

```bash
csdk domain-event list --select id,id
```

### List domainEvent records with filtering and ordering

```bash
csdk domain-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a domainEvent

```bash
csdk domain-event create --eventType <String> --managedDomainId <UUID> --ownerId <UUID> [--actorId <UUID>] [--domainVerificationId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a domainEvent by id

```bash
csdk domain-event get --id <value>
```
