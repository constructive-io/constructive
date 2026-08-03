# functionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionCapabilityBinding records via csdk CLI

## Usage

```bash
csdk function-capability-binding list
csdk function-capability-binding list --where.<field>.<op> <value> --orderBy <values>
csdk function-capability-binding list --limit 10 --after <cursor>
csdk function-capability-binding find-first --where.<field>.<op> <value>
csdk function-capability-binding get --id <UUID>
csdk function-capability-binding create --databaseId <UUID> --lifecycle <String> [--bucketId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--metadata <JSON>]
csdk function-capability-binding update --id <UUID> [--bucketId <UUID>] [--databaseId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--lifecycle <String>] [--metadata <JSON>]
csdk function-capability-binding delete --id <UUID>
```

## Examples

### List functionCapabilityBinding records

```bash
csdk function-capability-binding list
```

### List functionCapabilityBinding records with pagination

```bash
csdk function-capability-binding list --limit 10 --offset 0
```

### List functionCapabilityBinding records with cursor pagination

```bash
csdk function-capability-binding list --limit 10 --after <cursor>
```

### Find first matching functionCapabilityBinding

```bash
csdk function-capability-binding find-first --where.id.equalTo <value>
```

### List functionCapabilityBinding records with field selection

```bash
csdk function-capability-binding list --select id,id
```

### List functionCapabilityBinding records with filtering and ordering

```bash
csdk function-capability-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionCapabilityBinding

```bash
csdk function-capability-binding create --databaseId <UUID> --lifecycle <String> [--bucketId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--metadata <JSON>]
```

### Get a functionCapabilityBinding by id

```bash
csdk function-capability-binding get --id <value>
```
