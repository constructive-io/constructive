# platformSecret

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformSecret records via csdk CLI

## Usage

```bash
csdk platform-secret list
csdk platform-secret list --where.<field>.<op> <value> --orderBy <values>
csdk platform-secret list --limit 10 --after <cursor>
csdk platform-secret find-first --where.<field>.<op> <value>
csdk platform-secret get --id <UUID>
csdk platform-secret create --annotations <JSON> --description <String> --labels <JSON> --name <String> --namespaceId <UUID> --provider <String> --retiredAt <Datetime> --rotatedAt <Datetime>
csdk platform-secret update --id <UUID> [--annotations <JSON>] [--description <String>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--provider <String>] [--retiredAt <Datetime>] [--rotatedAt <Datetime>]
csdk platform-secret delete --id <UUID>
```

## Examples

### List platformSecret records

```bash
csdk platform-secret list
```

### List platformSecret records with pagination

```bash
csdk platform-secret list --limit 10 --offset 0
```

### List platformSecret records with cursor pagination

```bash
csdk platform-secret list --limit 10 --after <cursor>
```

### Find first matching platformSecret

```bash
csdk platform-secret find-first --where.id.equalTo <value>
```

### List platformSecret records with field selection

```bash
csdk platform-secret list --select id,id
```

### List platformSecret records with filtering and ordering

```bash
csdk platform-secret list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformSecret

```bash
csdk platform-secret create --annotations <JSON> --description <String> --labels <JSON> --name <String> --namespaceId <UUID> --provider <String> --retiredAt <Datetime> --rotatedAt <Datetime>
```

### Get a platformSecret by id

```bash
csdk platform-secret get --id <value>
```
