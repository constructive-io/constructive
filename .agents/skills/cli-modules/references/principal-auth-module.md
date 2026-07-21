# principalAuthModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrincipalAuthModule records via csdk CLI

## Usage

```bash
csdk principal-auth-module list
csdk principal-auth-module list --where.<field>.<op> <value> --orderBy <values>
csdk principal-auth-module list --limit 10 --after <cursor>
csdk principal-auth-module find-first --where.<field>.<op> <value>
csdk principal-auth-module get --id <UUID>
csdk principal-auth-module create --databaseId <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--createOrgApiKeyFunction <String>] [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--revokeOrgApiKeyFunction <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
csdk principal-auth-module update --id <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--createOrgApiKeyFunction <String>] [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--databaseId <UUID>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--revokeOrgApiKeyFunction <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
csdk principal-auth-module delete --id <UUID>
```

## Examples

### List principalAuthModule records

```bash
csdk principal-auth-module list
```

### List principalAuthModule records with pagination

```bash
csdk principal-auth-module list --limit 10 --offset 0
```

### List principalAuthModule records with cursor pagination

```bash
csdk principal-auth-module list --limit 10 --after <cursor>
```

### Find first matching principalAuthModule

```bash
csdk principal-auth-module find-first --where.id.equalTo <value>
```

### List principalAuthModule records with field selection

```bash
csdk principal-auth-module list --select id,id
```

### List principalAuthModule records with filtering and ordering

```bash
csdk principal-auth-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a principalAuthModule

```bash
csdk principal-auth-module create --databaseId <UUID> [--apiName <String>] [--auditsTableId <UUID>] [--createOrgApiKeyFunction <String>] [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--revokeOrgApiKeyFunction <String>] [--schemaId <UUID>] [--sessionCredentialsTableId <UUID>] [--sessionsTableId <UUID>] [--usersTableId <UUID>]
```

### Get a principalAuthModule by id

```bash
csdk principal-auth-module get --id <value>
```
