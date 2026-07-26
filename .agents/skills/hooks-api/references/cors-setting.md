# corsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-wide and per-API CORS origin configuration; NULL api_id means scope-wide default

## Usage

```typescript
useCorsSettingsQuery({ selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, databaseId: true, id: true, updatedAt: true } } })
useCorsSettingQuery({ id: '<UUID>', selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, databaseId: true, id: true, updatedAt: true } } })
useCreateCorsSettingMutation({ selection: { fields: { id: true } } })
useUpdateCorsSettingMutation({ selection: { fields: { id: true } } })
useDeleteCorsSettingMutation({})
```

## Examples

### List all corsSettings

```typescript
const { data, isLoading } = useCorsSettingsQuery({
  selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, databaseId: true, id: true, updatedAt: true } },
});
```

### Create a corsSetting

```typescript
const { mutate } = useCreateCorsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ allowedOrigins: '<String>', apiId: '<UUID>', databaseId: '<UUID>' });
```
