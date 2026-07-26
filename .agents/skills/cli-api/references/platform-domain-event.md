# platformDomainEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformDomainEvent records via csdk CLI

## Usage

```bash
csdk platform-domain-event list
csdk platform-domain-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-domain-event list --limit 10 --after <cursor>
csdk platform-domain-event find-first --where.<field>.<op> <value>
csdk platform-domain-event get --id <UUID>
csdk platform-domain-event create --eventType <String> [--actorId <UUID>] [--domainId <UUID>] [--domainVerificationId <UUID>] [--managedDomainId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-domain-event update --id <UUID> [--actorId <UUID>] [--domainId <UUID>] [--domainVerificationId <UUID>] [--eventType <String>] [--managedDomainId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-domain-event delete --id <UUID>
```

## Examples

### List platformDomainEvent records

```bash
csdk platform-domain-event list
```

### List platformDomainEvent records with pagination

```bash
csdk platform-domain-event list --limit 10 --offset 0
```

### List platformDomainEvent records with cursor pagination

```bash
csdk platform-domain-event list --limit 10 --after <cursor>
```

### Find first matching platformDomainEvent

```bash
csdk platform-domain-event find-first --where.id.equalTo <value>
```

### List platformDomainEvent records with field selection

```bash
csdk platform-domain-event list --select id,id
```

### List platformDomainEvent records with filtering and ordering

```bash
csdk platform-domain-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformDomainEvent

```bash
csdk platform-domain-event create --eventType <String> [--actorId <UUID>] [--domainId <UUID>] [--domainVerificationId <UUID>] [--managedDomainId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a platformDomainEvent by id

```bash
csdk platform-domain-event get --id <value>
```
