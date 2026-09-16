# orgCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgCapabilityDefaultGrant records via csdk CLI

## Usage

```bash
csdk org-capability-default-grant list
csdk org-capability-default-grant list --where.<field>.<op> <value> --orderBy <values>
csdk org-capability-default-grant list --limit 10 --after <cursor>
csdk org-capability-default-grant find-first --where.<field>.<op> <value>
csdk org-capability-default-grant get --id <UUID>
csdk org-capability-default-grant create --capabilityId <UUID> --entityId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
csdk org-capability-default-grant update --id <UUID> [--capabilityId <UUID>] [--entityId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>]
csdk org-capability-default-grant delete --id <UUID>
```

## Examples

### List orgCapabilityDefaultGrant records

```bash
csdk org-capability-default-grant list
```

### List orgCapabilityDefaultGrant records with pagination

```bash
csdk org-capability-default-grant list --limit 10 --offset 0
```

### List orgCapabilityDefaultGrant records with cursor pagination

```bash
csdk org-capability-default-grant list --limit 10 --after <cursor>
```

### Find first matching orgCapabilityDefaultGrant

```bash
csdk org-capability-default-grant find-first --where.id.equalTo <value>
```

### List orgCapabilityDefaultGrant records with field selection

```bash
csdk org-capability-default-grant list --select id,id
```

### List orgCapabilityDefaultGrant records with filtering and ordering

```bash
csdk org-capability-default-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgCapabilityDefaultGrant

```bash
csdk org-capability-default-grant create --capabilityId <UUID> --entityId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
```

### Get a orgCapabilityDefaultGrant by id

```bash
csdk org-capability-default-grant get --id <value>
```
