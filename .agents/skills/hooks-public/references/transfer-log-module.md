# transferLogModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for TransferLogModule data operations

## Usage

```typescript
useTransferLogModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } } })
useTransferLogModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } } })
useCreateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useUpdateTransferLogModuleMutation({ selection: { fields: { id: true } } })
useDeleteTransferLogModuleMutation({})
```

## Examples

### List all transferLogModules

```typescript
const { data, isLoading } = useTransferLogModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, transferLogTableId: true, transferLogTableName: true, usageDailyTableId: true, usageDailyTableName: true, interval: true, retention: true, premake: true, scope: true, actorFkTableId: true, entityFkTableId: true, prefix: true } },
});
```

### Create a transferLogModule

```typescript
const { mutate } = useCreateTransferLogModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', transferLogTableId: '<UUID>', transferLogTableName: '<String>', usageDailyTableId: '<UUID>', usageDailyTableName: '<String>', interval: '<String>', retention: '<String>', premake: '<Int>', scope: '<String>', actorFkTableId: '<UUID>', entityFkTableId: '<UUID>', prefix: '<String>' });
```
