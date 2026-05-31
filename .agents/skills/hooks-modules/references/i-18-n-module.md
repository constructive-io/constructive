# i18NModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for I18NModule data operations

## Usage

```typescript
useI18nModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } } })
useI18NModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } } })
useCreateI18NModuleMutation({ selection: { fields: { id: true } } })
useUpdateI18NModuleMutation({ selection: { fields: { id: true } } })
useDeleteI18NModuleMutation({})
```

## Examples

### List all i18nModules

```typescript
const { data, isLoading } = useI18nModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, settingsTableId: true, apiName: true, privateApiName: true } },
});
```

### Create a i18NModule

```typescript
const { mutate } = useCreateI18NModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', settingsTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' });
```
