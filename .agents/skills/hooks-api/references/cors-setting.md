# corsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-database and per-API CORS origin configuration; typed replacement for api_modules cors JSONB entries

## Usage

```typescript
useCorsSettingsQuery({ selection: { fields: { id: true, databaseId: true, apiId: true, allowedOrigins: true } } })
useCorsSettingQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, apiId: true, allowedOrigins: true } } })
useCreateCorsSettingMutation({ selection: { fields: { id: true } } })
useUpdateCorsSettingMutation({ selection: { fields: { id: true } } })
useDeleteCorsSettingMutation({})
```

## Examples

### List all corsSettings

```typescript
const { data, isLoading } = useCorsSettingsQuery({
  selection: { fields: { id: true, databaseId: true, apiId: true, allowedOrigins: true } },
});
```

### Create a corsSetting

```typescript
const { mutate } = useCreateCorsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', apiId: '<UUID>', allowedOrigins: '<String>' });
```
