# webauthnCredential

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for WebauthnCredential records via csdk CLI

## Usage

```bash
csdk webauthn-credential list
csdk webauthn-credential list --where.<field>.<op> <value> --orderBy <values>
csdk webauthn-credential list --limit 10 --after <cursor>
csdk webauthn-credential find-first --where.<field>.<op> <value>
csdk webauthn-credential get --id <UUID>
csdk webauthn-credential create --credentialId <String> --publicKey <Base64EncodedBinary> --webauthnUserId <String> --credentialDeviceType <String> [--ownerId <UUID>] [--signCount <BigInt>] [--transports <String>] [--backupEligible <Boolean>] [--backupState <Boolean>] [--name <String>] [--lastUsedAt <Datetime>]
csdk webauthn-credential update --id <UUID> [--ownerId <UUID>] [--credentialId <String>] [--publicKey <Base64EncodedBinary>] [--signCount <BigInt>] [--webauthnUserId <String>] [--transports <String>] [--credentialDeviceType <String>] [--backupEligible <Boolean>] [--backupState <Boolean>] [--name <String>] [--lastUsedAt <Datetime>]
csdk webauthn-credential delete --id <UUID>
```

## Examples

### List webauthnCredential records

```bash
csdk webauthn-credential list
```

### List webauthnCredential records with pagination

```bash
csdk webauthn-credential list --limit 10 --offset 0
```

### List webauthnCredential records with cursor pagination

```bash
csdk webauthn-credential list --limit 10 --after <cursor>
```

### Find first matching webauthnCredential

```bash
csdk webauthn-credential find-first --where.id.equalTo <value>
```

### List webauthnCredential records with field selection

```bash
csdk webauthn-credential list --select id,id
```

### List webauthnCredential records with filtering and ordering

```bash
csdk webauthn-credential list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a webauthnCredential

```bash
csdk webauthn-credential create --credentialId <String> --publicKey <Base64EncodedBinary> --webauthnUserId <String> --credentialDeviceType <String> [--ownerId <UUID>] [--signCount <BigInt>] [--transports <String>] [--backupEligible <Boolean>] [--backupState <Boolean>] [--name <String>] [--lastUsedAt <Datetime>]
```

### Get a webauthnCredential by id

```bash
csdk webauthn-credential get --id <value>
```
