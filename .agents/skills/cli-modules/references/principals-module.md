# principalsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrincipalsModule records via csdk CLI

## Usage

```bash
csdk principals-module list
csdk principals-module list --where.<field>.<op> <value> --orderBy <values>
csdk principals-module list --limit 10 --after <cursor>
csdk principals-module find-first --where.<field>.<op> <value>
csdk principals-module get --id <UUID>
csdk principals-module create --databaseId <UUID> [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--privateSchemaId <UUID>] [--schemaId <UUID>] [--sweepExpiredPrincipalsFunction <String>] [--usersTableId <UUID>]
csdk principals-module update --id <UUID> [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--databaseId <UUID>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--privateSchemaId <UUID>] [--schemaId <UUID>] [--sweepExpiredPrincipalsFunction <String>] [--usersTableId <UUID>]
csdk principals-module delete --id <UUID>
```

## Examples

### List principalsModule records

```bash
csdk principals-module list
```

### List principalsModule records with pagination

```bash
csdk principals-module list --limit 10 --offset 0
```

### List principalsModule records with cursor pagination

```bash
csdk principals-module list --limit 10 --after <cursor>
```

### Find first matching principalsModule

```bash
csdk principals-module find-first --where.id.equalTo <value>
```

### List principalsModule records with field selection

```bash
csdk principals-module list --select id,id
```

### List principalsModule records with filtering and ordering

```bash
csdk principals-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a principalsModule

```bash
csdk principals-module create --databaseId <UUID> [--createOrgPrincipalFunction <String>] [--createPrincipalFunction <String>] [--deleteOrgPrincipalFunction <String>] [--deletePrincipalFunction <String>] [--principalEntitiesTableId <UUID>] [--principalScopeOverridesTableId <UUID>] [--principalsTableId <UUID>] [--principalsTableName <String>] [--privateSchemaId <UUID>] [--schemaId <UUID>] [--sweepExpiredPrincipalsFunction <String>] [--usersTableId <UUID>]
```

### Get a principalsModule by id

```bash
csdk principals-module get --id <value>
```
