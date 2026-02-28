# hooks-invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InvitesModule data operations

## Usage

```typescript
useInvitesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } } })
useInvitesModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } } })
useCreateInvitesModuleMutation({ selection: { fields: { id: true } } })
useUpdateInvitesModuleMutation({ selection: { fields: { id: true } } })
useDeleteInvitesModuleMutation({})
```

## Examples

### List all invitesModules

```typescript
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, prefix: true, membershipType: true, entityTableId: true } },
});
```

### Create a invitesModule

```typescript
const { mutate } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', invitesTableId: '<value>', claimedInvitesTableId: '<value>', invitesTableName: '<value>', claimedInvitesTableName: '<value>', submitInviteCodeFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>' });
```
