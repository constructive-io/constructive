# appCapabilityDefaultGrant

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppCapabilityDefaultGrant records via csdk CLI

## Usage

```bash
csdk app-capability-default-grant list
csdk app-capability-default-grant list --where.<field>.<op> <value> --orderBy <values>
csdk app-capability-default-grant list --limit 10 --after <cursor>
csdk app-capability-default-grant find-first --where.<field>.<op> <value>
csdk app-capability-default-grant get --id <UUID>
csdk app-capability-default-grant create --capabilityId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
csdk app-capability-default-grant update --id <UUID> [--capabilityId <UUID>] [--grantorId <UUID>] [--isGrant <Boolean>]
csdk app-capability-default-grant delete --id <UUID>
```

## Examples

### List appCapabilityDefaultGrant records

```bash
csdk app-capability-default-grant list
```

### List appCapabilityDefaultGrant records with pagination

```bash
csdk app-capability-default-grant list --limit 10 --offset 0
```

### List appCapabilityDefaultGrant records with cursor pagination

```bash
csdk app-capability-default-grant list --limit 10 --after <cursor>
```

### Find first matching appCapabilityDefaultGrant

```bash
csdk app-capability-default-grant find-first --where.id.equalTo <value>
```

### List appCapabilityDefaultGrant records with field selection

```bash
csdk app-capability-default-grant list --select id,id
```

### List appCapabilityDefaultGrant records with filtering and ordering

```bash
csdk app-capability-default-grant list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appCapabilityDefaultGrant

```bash
csdk app-capability-default-grant create --capabilityId <UUID> [--grantorId <UUID>] [--isGrant <Boolean>]
```

### Get a appCapabilityDefaultGrant by id

```bash
csdk app-capability-default-grant get --id <value>
```
