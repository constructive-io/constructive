# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for InvitesModule data operations

## Usage

```typescript
useInvitesModulesQuery({ selection: { fields: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } } })
useInvitesModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } } })
useCreateInvitesModuleMutation({ selection: { fields: { id: true } } })
useUpdateInvitesModuleMutation({ selection: { fields: { id: true } } })
useDeleteInvitesModuleMutation({})
```

## Examples

### List all invitesModules

```typescript
const { data, isLoading } = useInvitesModulesQuery({
  selection: { fields: { apiName: true, claimedInvitesTableId: true, claimedInvitesTableName: true, databaseId: true, emailsTableId: true, entityField: true, entityTableId: true, id: true, invitesTableId: true, invitesTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, schemaId: true, scope: true, submitInviteCodeFunction: true, usersTableId: true } },
});
```

### Create a invitesModule

```typescript
const { mutate } = useCreateInvitesModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', claimedInvitesTableId: '<UUID>', claimedInvitesTableName: '<String>', databaseId: '<UUID>', emailsTableId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', invitesTableId: '<UUID>', invitesTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', submitInviteCodeFunction: '<String>', usersTableId: '<UUID>' });
```
