# oauthRequestsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OauthRequestsModule records via csdk CLI

## Usage

```bash
csdk oauth-requests-module list
csdk oauth-requests-module list --where.<field>.<op> <value> --orderBy <values>
csdk oauth-requests-module list --limit 10 --after <cursor>
csdk oauth-requests-module find-first --where.<field>.<op> <value>
csdk oauth-requests-module get --id <UUID>
csdk oauth-requests-module create --databaseId <UUID> --scope <String> [--entityField <String>] [--entityTableId <UUID>] [--oauthAuthorizationRequestsTableId <UUID>] [--oauthAuthorizationRequestsTableName <String>] [--pendingIdentityLinksTableId <UUID>] [--pendingIdentityLinksTableName <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>]
csdk oauth-requests-module update --id <UUID> [--databaseId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--oauthAuthorizationRequestsTableId <UUID>] [--oauthAuthorizationRequestsTableName <String>] [--pendingIdentityLinksTableId <UUID>] [--pendingIdentityLinksTableName <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--scope <String>]
csdk oauth-requests-module delete --id <UUID>
```

## Examples

### List oauthRequestsModule records

```bash
csdk oauth-requests-module list
```

### List oauthRequestsModule records with pagination

```bash
csdk oauth-requests-module list --limit 10 --offset 0
```

### List oauthRequestsModule records with cursor pagination

```bash
csdk oauth-requests-module list --limit 10 --after <cursor>
```

### Find first matching oauthRequestsModule

```bash
csdk oauth-requests-module find-first --where.id.equalTo <value>
```

### List oauthRequestsModule records with field selection

```bash
csdk oauth-requests-module list --select id,id
```

### List oauthRequestsModule records with filtering and ordering

```bash
csdk oauth-requests-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a oauthRequestsModule

```bash
csdk oauth-requests-module create --databaseId <UUID> --scope <String> [--entityField <String>] [--entityTableId <UUID>] [--oauthAuthorizationRequestsTableId <UUID>] [--oauthAuthorizationRequestsTableName <String>] [--pendingIdentityLinksTableId <UUID>] [--pendingIdentityLinksTableName <String>] [--prefix <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>]
```

### Get a oauthRequestsModule by id

```bash
csdk oauth-requests-module get --id <value>
```
