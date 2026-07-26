# platformCorsSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Scope-wide and per-API CORS origin configuration; NULL api_id means scope-wide default

## Usage

```typescript
usePlatformCorsSettingsQuery({ selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, id: true, updatedAt: true } } })
usePlatformCorsSettingQuery({ id: '<UUID>', selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, id: true, updatedAt: true } } })
useCreatePlatformCorsSettingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformCorsSettingMutation({ selection: { fields: { id: true } } })
useDeletePlatformCorsSettingMutation({})
```

## Examples

### List all platformCorsSettings

```typescript
const { data, isLoading } = usePlatformCorsSettingsQuery({
  selection: { fields: { allowedOrigins: true, apiId: true, createdAt: true, id: true, updatedAt: true } },
});
```

### Create a platformCorsSetting

```typescript
const { mutate } = useCreatePlatformCorsSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ allowedOrigins: '<String>', apiId: '<UUID>' });
```
