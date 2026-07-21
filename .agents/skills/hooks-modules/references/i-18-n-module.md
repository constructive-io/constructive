# i18NModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for I18NModule data operations

## Usage

```typescript
useI18nModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } } })
useI18NModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } } })
useCreateI18NModuleMutation({ selection: { fields: { id: true } } })
useUpdateI18NModuleMutation({ selection: { fields: { id: true } } })
useDeleteI18NModuleMutation({})
```

## Examples

### List all i18nModules

```typescript
const { data, isLoading } = useI18nModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, privateApiName: true, privateSchemaId: true, schemaId: true, settingsTableId: true } },
});
```

### Create a i18NModule

```typescript
const { mutate } = useCreateI18NModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', settingsTableId: '<UUID>' });
```
