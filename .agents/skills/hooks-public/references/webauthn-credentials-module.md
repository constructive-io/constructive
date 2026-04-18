# webauthnCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module (RP config, sign-in/sign-up function names) lands later; Phase 11a is credentials only.

## Usage

```typescript
useWebauthnCredentialsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
useWebauthnCredentialsModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
useCreateWebauthnCredentialsModuleMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnCredentialsModuleMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnCredentialsModuleMutation({})
```

## Examples

### List all webauthnCredentialsModules

```typescript
const { data, isLoading } = useWebauthnCredentialsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});
```

### Create a webauthnCredentialsModule

```typescript
const { mutate } = useCreateWebauthnCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' });
```
