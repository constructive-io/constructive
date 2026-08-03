# platformFunctionCapabilityBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionCapabilityBinding records via csdk CLI

## Usage

```bash
csdk platform-function-capability-binding list
csdk platform-function-capability-binding list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-capability-binding list --limit 10 --after <cursor>
csdk platform-function-capability-binding find-first --where.<field>.<op> <value>
csdk platform-function-capability-binding get --id <UUID>
csdk platform-function-capability-binding create --lifecycle <String> [--bucketId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--metadata <JSON>]
csdk platform-function-capability-binding update --id <UUID> [--bucketId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--lifecycle <String>] [--metadata <JSON>]
csdk platform-function-capability-binding delete --id <UUID>
```

## Examples

### List platformFunctionCapabilityBinding records

```bash
csdk platform-function-capability-binding list
```

### List platformFunctionCapabilityBinding records with pagination

```bash
csdk platform-function-capability-binding list --limit 10 --offset 0
```

### List platformFunctionCapabilityBinding records with cursor pagination

```bash
csdk platform-function-capability-binding list --limit 10 --after <cursor>
```

### Find first matching platformFunctionCapabilityBinding

```bash
csdk platform-function-capability-binding find-first --where.id.equalTo <value>
```

### List platformFunctionCapabilityBinding records with field selection

```bash
csdk platform-function-capability-binding list --select id,id
```

### List platformFunctionCapabilityBinding records with filtering and ordering

```bash
csdk platform-function-capability-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionCapabilityBinding

```bash
csdk platform-function-capability-binding create --lifecycle <String> [--bucketId <UUID>] [--functionId <UUID>] [--graphId <UUID>] [--key <String>] [--metadata <JSON>]
```

### Get a platformFunctionCapabilityBinding by id

```bash
csdk platform-function-capability-binding get --id <value>
```
