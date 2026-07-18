# webauthnCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state.

## Usage

```typescript
useWebauthnCredentialsModulesQuery({ selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useWebauthnCredentialsModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } } })
useCreateWebauthnCredentialsModuleMutation({ selection: { fields: { id: true } } })
useUpdateWebauthnCredentialsModuleMutation({ selection: { fields: { id: true } } })
useDeleteWebauthnCredentialsModuleMutation({})
```

## Examples

### List all webauthnCredentialsModules

```typescript
const { data, isLoading } = useWebauthnCredentialsModulesQuery({
  selection: { fields: { apiName: true, databaseId: true, id: true, ownerTableId: true, privateApiName: true, privateSchemaId: true, schemaId: true, tableId: true, tableName: true } },
});
```

### Create a webauthnCredentialsModule

```typescript
const { mutate } = useCreateWebauthnCredentialsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', ownerTableId: '<UUID>', privateApiName: '<String>', privateSchemaId: '<UUID>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
