# refusalLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RefusalLogModule data operations

## Usage

```typescript
useRefusalLogModulesQuery({ selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, logInterval: true, logPremake: true, logRetention: true, logTableId: true, logTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordRefusalsFunction: true, rollupRefusalUsageSummaryFunction: true, schemaId: true, scope: true, summaryInterval: true, summaryPremake: true, summaryRetention: true, summaryTableId: true, summaryTableName: true } } })
useRefusalLogModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, logInterval: true, logPremake: true, logRetention: true, logTableId: true, logTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordRefusalsFunction: true, rollupRefusalUsageSummaryFunction: true, schemaId: true, scope: true, summaryInterval: true, summaryPremake: true, summaryRetention: true, summaryTableId: true, summaryTableName: true } } })
useCreateRefusalLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateRefusalLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteRefusalLogModuleMutation({})
```

## Examples

### List all refusalLogModules

```typescript
const { data, isLoading } = useRefusalLogModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, entityField: true, id: true, logInterval: true, logPremake: true, logRetention: true, logTableId: true, logTableName: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, publicSchemaName: true, recordRefusalsFunction: true, rollupRefusalUsageSummaryFunction: true, schemaId: true, scope: true, summaryInterval: true, summaryPremake: true, summaryRetention: true, summaryTableId: true, summaryTableName: true } },
});
```

### Create a refusalLogModule

```typescript
const { mutate } = useCreateRefusalLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityField: '<String>', logInterval: '<String>', logPremake: '<Int>', logRetention: '<String>', logTableId: '<UUID>', logTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', recordRefusalsFunction: '<String>', rollupRefusalUsageSummaryFunction: '<String>', schemaId: '<UUID>', scope: '<String>', summaryInterval: '<String>', summaryPremake: '<Int>', summaryRetention: '<String>', summaryTableId: '<UUID>', summaryTableName: '<String>' });
```
