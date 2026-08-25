# userSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user settings and preferences. Extended by other modules (i18n, notifications, MFA) via metaschema.create_field().

## Usage

```typescript
useUserSettingsQuery({ selection: { fields: { createdAt: true, id: true, ownerId: true, updatedAt: true } } })
useUserSettingQuery({ id: '<UUID>', selection: { fields: { createdAt: true, id: true, ownerId: true, updatedAt: true } } })
useCreateUserSettingMutation({ selection: { fields: { id: true } } })
useUpdateUserSettingMutation({ selection: { fields: { id: true } } })
useDeleteUserSettingMutation({})
```

## Examples

### List all userSettings

```typescript
const { data, isLoading } = useUserSettingsQuery({
  selection: { fields: { createdAt: true, id: true, ownerId: true, updatedAt: true } },
});
```

### Create a userSetting

```typescript
const { mutate } = useCreateUserSettingMutation({
  selection: { fields: { id: true } },
});
mutate({ ownerId: '<UUID>' });
```
