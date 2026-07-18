# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InvitesModule records via csdk CLI

## Usage

```bash
csdk invites-module list
csdk invites-module list --where.<field>.<op> <value> --orderBy <values>
csdk invites-module list --limit 10 --after <cursor>
csdk invites-module find-first --where.<field>.<op> <value>
csdk invites-module get --id <UUID>
csdk invites-module create --databaseId <UUID> [--apiName <String>] [--claimedInvitesTableId <UUID>] [--claimedInvitesTableName <String>] [--emailsTableId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--invitesTableId <UUID>] [--invitesTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--submitInviteCodeFunction <String>] [--usersTableId <UUID>]
csdk invites-module update --id <UUID> [--apiName <String>] [--claimedInvitesTableId <UUID>] [--claimedInvitesTableName <String>] [--databaseId <UUID>] [--emailsTableId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--invitesTableId <UUID>] [--invitesTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--submitInviteCodeFunction <String>] [--usersTableId <UUID>]
csdk invites-module delete --id <UUID>
```

## Examples

### List invitesModule records

```bash
csdk invites-module list
```

### List invitesModule records with pagination

```bash
csdk invites-module list --limit 10 --offset 0
```

### List invitesModule records with cursor pagination

```bash
csdk invites-module list --limit 10 --after <cursor>
```

### Find first matching invitesModule

```bash
csdk invites-module find-first --where.id.equalTo <value>
```

### List invitesModule records with field selection

```bash
csdk invites-module list --select id,id
```

### List invitesModule records with filtering and ordering

```bash
csdk invites-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a invitesModule

```bash
csdk invites-module create --databaseId <UUID> [--apiName <String>] [--claimedInvitesTableId <UUID>] [--claimedInvitesTableName <String>] [--emailsTableId <UUID>] [--entityField <String>] [--entityTableId <UUID>] [--invitesTableId <UUID>] [--invitesTableName <String>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--publicSchemaName <String>] [--schemaId <UUID>] [--scope <String>] [--submitInviteCodeFunction <String>] [--usersTableId <UUID>]
```

### Get a invitesModule by id

```bash
csdk invites-module get --id <value>
```
