# domainModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for DomainModule data operations

## Usage

```typescript
useDomainModulesQuery({ selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainEventsTableId: true, domainEventsTableName: true, domainVerificationsTableId: true, domainVerificationsTableName: true, domainsTableId: true, domainsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useDomainModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainEventsTableId: true, domainEventsTableName: true, domainVerificationsTableId: true, domainVerificationsTableName: true, domainsTableId: true, domainsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } } })
useCreateDomainModuleMutation({ selection: { fields: { id: true } } })
useUpdateDomainModuleMutation({ selection: { fields: { id: true } } })
useDeleteDomainModuleMutation({})
```

## Examples

### List all domainModules

```typescript
const { data, isLoading } = useDomainModulesQuery({
  selection: { fields: { apiName: true, catalogModuleId: true, databaseId: true, defaultPermissions: true, domainEventsTableId: true, domainEventsTableName: true, domainVerificationsTableId: true, domainVerificationsTableName: true, domainsTableId: true, domainsTableName: true, entityField: true, entityTableId: true, id: true, policies: true, prefix: true, privateApiName: true, provisions: true, publicSchemaName: true, schemaId: true, scope: true } },
});
```

### Create a domainModule

```typescript
const { mutate } = useCreateDomainModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', catalogModuleId: '<UUID>', databaseId: '<UUID>', defaultPermissions: '<String>', domainEventsTableId: '<UUID>', domainEventsTableName: '<String>', domainVerificationsTableId: '<UUID>', domainVerificationsTableName: '<String>', domainsTableId: '<UUID>', domainsTableName: '<String>', entityField: '<String>', entityTableId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>' });
```
