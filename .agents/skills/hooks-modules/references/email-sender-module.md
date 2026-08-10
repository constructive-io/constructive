# emailSenderModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmailSenderModule data operations

## Usage

```typescript
useEmailSenderModulesQuery({ selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, emailIdentitiesTableId: true, emailIdentitiesTableName: true, emailProviderAccountsTableId: true, emailProviderAccountsTableName: true, emailSiteIdentitiesTableId: true, emailSiteIdentitiesTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteSurfaceModuleId: true } } })
useEmailSenderModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, emailIdentitiesTableId: true, emailIdentitiesTableName: true, emailProviderAccountsTableId: true, emailProviderAccountsTableName: true, emailSiteIdentitiesTableId: true, emailSiteIdentitiesTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteSurfaceModuleId: true } } })
useCreateEmailSenderModuleMutation({ selection: { fields: { id: true } } })
useUpdateEmailSenderModuleMutation({ selection: { fields: { id: true } } })
useDeleteEmailSenderModuleMutation({})
```

## Examples

### List all emailSenderModules

```typescript
const { data, isLoading } = useEmailSenderModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, defaultCapabilities: true, emailIdentitiesTableId: true, emailIdentitiesTableName: true, emailProviderAccountsTableId: true, emailProviderAccountsTableName: true, emailSiteIdentitiesTableId: true, emailSiteIdentitiesTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true, siteSurfaceModuleId: true } },
});
```

### Create a emailSenderModule

```typescript
const { mutate } = useCreateEmailSenderModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', emailIdentitiesTableId: '<UUID>', emailIdentitiesTableName: '<String>', emailProviderAccountsTableId: '<UUID>', emailProviderAccountsTableName: '<String>', emailSiteIdentitiesTableId: '<UUID>', emailSiteIdentitiesTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', siteSurfaceModuleId: '<UUID>' });
```
