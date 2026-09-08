# userSettingsSecurity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user security settings for MFA configuration (separate from user_settings preferences)

## Usage

```typescript
useUserSettingsSecuritiesQuery({ selection: { fields: { backupCodesCount: true, createdAt: true, emailMfaEnabled: true, id: true, mfaEnrolledAt: true, mfaLastUsedAt: true, ownerId: true, smsMfaEnabled: true, totpEnabled: true, updatedAt: true } } })
useUserSettingsSecurityQuery({ id: '<UUID>', selection: { fields: { backupCodesCount: true, createdAt: true, emailMfaEnabled: true, id: true, mfaEnrolledAt: true, mfaLastUsedAt: true, ownerId: true, smsMfaEnabled: true, totpEnabled: true, updatedAt: true } } })
useCreateUserSettingsSecurityMutation({ selection: { fields: { id: true } } })
useUpdateUserSettingsSecurityMutation({ selection: { fields: { id: true } } })
useDeleteUserSettingsSecurityMutation({})
```

## Examples

### List all userSettingsSecurities

```typescript
const { data, isLoading } = useUserSettingsSecuritiesQuery({
  selection: { fields: { backupCodesCount: true, createdAt: true, emailMfaEnabled: true, id: true, mfaEnrolledAt: true, mfaLastUsedAt: true, ownerId: true, smsMfaEnabled: true, totpEnabled: true, updatedAt: true } },
});
```

### Create a userSettingsSecurity

```typescript
const { mutate } = useCreateUserSettingsSecurityMutation({
  selection: { fields: { id: true } },
});
mutate({ backupCodesCount: '<Int>', emailMfaEnabled: '<Boolean>', mfaEnrolledAt: '<Datetime>', mfaLastUsedAt: '<Datetime>', ownerId: '<UUID>', smsMfaEnabled: '<Boolean>', totpEnabled: '<Boolean>' });
```
