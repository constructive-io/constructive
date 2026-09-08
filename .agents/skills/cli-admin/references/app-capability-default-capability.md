# appCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppCapabilityDefaultCapability records via csdk CLI

## Usage

```bash
csdk app-capability-default-capability list
csdk app-capability-default-capability list --where.<field>.<op> <value> --orderBy <values>
csdk app-capability-default-capability list --limit 10 --after <cursor>
csdk app-capability-default-capability find-first --where.<field>.<op> <value>
csdk app-capability-default-capability get --id <UUID>
csdk app-capability-default-capability create --capabilityId <UUID>
csdk app-capability-default-capability update --id <UUID> [--capabilityId <UUID>]
csdk app-capability-default-capability delete --id <UUID>
```

## Examples

### List appCapabilityDefaultCapability records

```bash
csdk app-capability-default-capability list
```

### List appCapabilityDefaultCapability records with pagination

```bash
csdk app-capability-default-capability list --limit 10 --offset 0
```

### List appCapabilityDefaultCapability records with cursor pagination

```bash
csdk app-capability-default-capability list --limit 10 --after <cursor>
```

### Find first matching appCapabilityDefaultCapability

```bash
csdk app-capability-default-capability find-first --where.id.equalTo <value>
```

### List appCapabilityDefaultCapability records with field selection

```bash
csdk app-capability-default-capability list --select id,id
```

### List appCapabilityDefaultCapability records with filtering and ordering

```bash
csdk app-capability-default-capability list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appCapabilityDefaultCapability

```bash
csdk app-capability-default-capability create --capabilityId <UUID>
```

### Get a appCapabilityDefaultCapability by id

```bash
csdk app-capability-default-capability get --id <value>
```
