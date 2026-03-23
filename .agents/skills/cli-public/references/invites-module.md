# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for InvitesModule records via csdk CLI

## Usage

```bash
csdk invites-module list
csdk invites-module get --id <UUID>
csdk invites-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--invitesTableId <UUID>] [--claimedInvitesTableId <UUID>] [--invitesTableName <String>] [--claimedInvitesTableName <String>] [--submitInviteCodeFunction <String>] [--prefix <String>] [--entityTableId <UUID>]
csdk invites-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--invitesTableId <UUID>] [--claimedInvitesTableId <UUID>] [--invitesTableName <String>] [--claimedInvitesTableName <String>] [--submitInviteCodeFunction <String>] [--prefix <String>] [--membershipType <Int>] [--entityTableId <UUID>]
csdk invites-module delete --id <UUID>
```

## Examples

### List all invitesModule records

```bash
csdk invites-module list
```

### Create a invitesModule

```bash
csdk invites-module create --databaseId <UUID> --membershipType <Int> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--emailsTableId <UUID>] [--usersTableId <UUID>] [--invitesTableId <UUID>] [--claimedInvitesTableId <UUID>] [--invitesTableName <String>] [--claimedInvitesTableName <String>] [--submitInviteCodeFunction <String>] [--prefix <String>] [--entityTableId <UUID>]
```

### Get a invitesModule by id

```bash
csdk invites-module get --id <value>
```
