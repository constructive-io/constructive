# hostnameBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for HostnameBinding records via csdk CLI

## Usage

```bash
csdk hostname-binding list
csdk hostname-binding list --where.<field>.<op> <value> --orderBy <values>
csdk hostname-binding list --limit 10 --after <cursor>
csdk hostname-binding find-first --where.<field>.<op> <value>
csdk hostname-binding get --id <UUID>
csdk hostname-binding create --domainId <UUID> --hostname <String> [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>]
csdk hostname-binding update --id <UUID> [--domainId <UUID>] [--hostname <String>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>]
csdk hostname-binding delete --id <UUID>
```

## Examples

### List hostnameBinding records

```bash
csdk hostname-binding list
```

### List hostnameBinding records with pagination

```bash
csdk hostname-binding list --limit 10 --offset 0
```

### List hostnameBinding records with cursor pagination

```bash
csdk hostname-binding list --limit 10 --after <cursor>
```

### Find first matching hostnameBinding

```bash
csdk hostname-binding find-first --where.id.equalTo <value>
```

### List hostnameBinding records with field selection

```bash
csdk hostname-binding list --select id,id
```

### List hostnameBinding records with filtering and ordering

```bash
csdk hostname-binding list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a hostnameBinding

```bash
csdk hostname-binding create --domainId <UUID> --hostname <String> [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsSecretName <String>] [--tlsStatus <String>] [--verificationStatus <String>]
```

### Get a hostnameBinding by id

```bash
csdk hostname-binding get --id <value>
```
