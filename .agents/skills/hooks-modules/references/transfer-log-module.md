# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TransferLogModule data operations

## Usage

```typescript
useTransferLogModulesQuery({ selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true } } })
useTransferLogModuleQuery({ id: '<UUID>', selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true } } })
useCreateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteTransferLogModuleMutation({})
```

## Examples

### List all transferLogModules

```typescript
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { actorFkTableId: true, apiName: true, databaseId: true, entityField: true, entityFkTableId: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true } },
});
```

### Create a transferLogModule

```typescript
const { mutate } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ actorFkTableId: '<UUID>', apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', entityFkTableId: '<UUID>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>' });
```
