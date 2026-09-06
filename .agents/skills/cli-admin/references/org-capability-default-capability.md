# orgCapabilityDefaultCapability

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgCapabilityDefaultCapability records via csdk CLI

## Usage

```bash
csdk org-capability-default-capability list
csdk org-capability-default-capability list --where.<field>.<op> <value> --orderBy <values>
csdk org-capability-default-capability list --limit 10 --after <cursor>
csdk org-capability-default-capability find-first --where.<field>.<op> <value>
csdk org-capability-default-capability get --id <UUID>
csdk org-capability-default-capability create --capabilityId <UUID> --entityId <UUID>
csdk org-capability-default-capability update --id <UUID> [--capabilityId <UUID>] [--entityId <UUID>]
csdk org-capability-default-capability delete --id <UUID>
```

## Examples

### List orgCapabilityDefaultCapability records

```bash
csdk org-capability-default-capability list
```

### List orgCapabilityDefaultCapability records with pagination

```bash
csdk org-capability-default-capability list --limit 10 --offset 0
```

### List orgCapabilityDefaultCapability records with cursor pagination

```bash
csdk org-capability-default-capability list --limit 10 --after <cursor>
```

### Find first matching orgCapabilityDefaultCapability

```bash
csdk org-capability-default-capability find-first --where.id.equalTo <value>
```

### List orgCapabilityDefaultCapability records with field selection

```bash
csdk org-capability-default-capability list --select id,id
```

### List orgCapabilityDefaultCapability records with filtering and ordering

```bash
csdk org-capability-default-capability list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgCapabilityDefaultCapability

```bash
csdk org-capability-default-capability create --capabilityId <UUID> --entityId <UUID>
```

### Get a orgCapabilityDefaultCapability by id

```bash
csdk org-capability-default-capability get --id <value>
```
