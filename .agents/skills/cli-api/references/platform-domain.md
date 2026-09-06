# platformDomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformDomain records via csdk CLI

## Usage

```bash
csdk platform-domain list
csdk platform-domain list --where.<field>.<op> <value> --orderBy <values>
csdk platform-domain list --limit 10 --after <cursor>
csdk platform-domain find-first --where.<field>.<op> <value>
csdk platform-domain get --id <UUID>
csdk platform-domain create --hostname <String> [--config <JSON>] [--createdByPrincipal <UUID>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--updatedByPrincipal <UUID>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
csdk platform-domain update --id <UUID> [--config <JSON>] [--createdByPrincipal <UUID>] [--hostname <String>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--updatedByPrincipal <UUID>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
csdk platform-domain delete --id <UUID>
```

## Examples

### List platformDomain records

```bash
csdk platform-domain list
```

### List platformDomain records with pagination

```bash
csdk platform-domain list --limit 10 --offset 0
```

### List platformDomain records with cursor pagination

```bash
csdk platform-domain list --limit 10 --after <cursor>
```

### Find first matching platformDomain

```bash
csdk platform-domain find-first --where.id.equalTo <value>
```

### List platformDomain records with field selection

```bash
csdk platform-domain list --select id,id
```

### List platformDomain records with filtering and ordering

```bash
csdk platform-domain list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformDomain

```bash
csdk platform-domain create --hostname <String> [--config <JSON>] [--createdByPrincipal <UUID>] [--isPublished <Boolean>] [--isWildcard <Boolean>] [--managed <Boolean>] [--parentHostname <String>] [--tlsReadyAt <Datetime>] [--tlsSecretName <String>] [--tlsStatus <String>] [--updatedByPrincipal <UUID>] [--verificationStatus <String>] [--verifiedAt <Datetime>]
```

### Get a platformDomain by id

```bash
csdk platform-domain get --id <value>
```
