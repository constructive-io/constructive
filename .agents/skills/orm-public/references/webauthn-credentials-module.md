# webauthnCredentialsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the webauthn_credentials_module, which provisions the per-user WebAuthn/passkey credentials table (public key, counter, transports, device type, backup state) mirroring crypto_addresses_module. The sibling webauthn_auth_module holds RP config and the registration/sign-in challenge state.

## Usage

```typescript
db.webauthnCredentialsModule.findMany({ select: { id: true } }).execute()
db.webauthnCredentialsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.webauthnCredentialsModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' }, select: { id: true } }).execute()
db.webauthnCredentialsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.webauthnCredentialsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all webauthnCredentialsModule records

```typescript
const items = await db.webauthnCredentialsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a webauthnCredentialsModule

```typescript
const item = await db.webauthnCredentialsModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', ownerTableId: '<UUID>', tableName: '<String>' },
  select: { id: true }
}).execute();
```
