# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InvitesModule data operations

## Usage

```typescript
useInvitesModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } } })
useInvitesModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } } })
useCreateInvitesModuleMutation({ selection: { fields: { id: true } } })
useUpdateInvitesModuleMutation({ selection: { fields: { id: true } } })
useDeleteInvitesModuleMutation({})
```

## Examples

### List all invitesModules

```typescript
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, publicSchemaName: true, privateSchemaName: true, emailsTableId: true, usersTableId: true, invitesTableId: true, claimedInvitesTableId: true, invitesTableName: true, claimedInvitesTableName: true, submitInviteCodeFunction: true, scope: true, prefix: true, entityTableId: true, apiName: true, privateApiName: true } },
});
```

### Create a invitesModule

```typescript
const { mutate } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```
