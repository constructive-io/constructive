# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TransferLogModule data operations

## Usage

```typescript
useTransferLogModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useTransferLogModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } } })
useCreateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteTransferLogModuleMutation({})
```

## Examples

### List all transferLogModules

```typescript
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, interval: true, prefix: true, premake: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, retention: true, rollupFunctionName: true, schemaId: true, scope: true, transferLogTableId: true, transferLogTableName: true, usageSummaryTableId: true, usageSummaryTableName: true } },
});
```

### Create a transferLogModule

```typescript
const { mutate } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', interval: '<String>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', retention: '<String>', rollupFunctionName: '<String>', schemaId: '<UUID>', scope: '<String>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageSummaryTableId: '<UUID>', usageSummaryTableName: '<String>' });
```
