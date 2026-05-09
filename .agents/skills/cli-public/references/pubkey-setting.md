# pubkeySetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PubkeySetting records via csdk CLI

## Usage

```bash
csdk pubkey-setting list
csdk pubkey-setting list --where.<field>.<op> <value> --orderBy <values>
csdk pubkey-setting list --limit 10 --after <cursor>
csdk pubkey-setting find-first --where.<field>.<op> <value>
csdk pubkey-setting get --id <UUID>
csdk pubkey-setting create --databaseId <UUID> [--schemaId <UUID>] [--cryptoNetwork <String>] [--userField <String>] [--signUpWithKeyFunctionId <UUID>] [--signInRequestChallengeFunctionId <UUID>] [--signInRecordFailureFunctionId <UUID>] [--signInWithChallengeFunctionId <UUID>]
csdk pubkey-setting update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--cryptoNetwork <String>] [--userField <String>] [--signUpWithKeyFunctionId <UUID>] [--signInRequestChallengeFunctionId <UUID>] [--signInRecordFailureFunctionId <UUID>] [--signInWithChallengeFunctionId <UUID>]
csdk pubkey-setting delete --id <UUID>
```

## Examples

### List pubkeySetting records

```bash
csdk pubkey-setting list
```

### List pubkeySetting records with pagination

```bash
csdk pubkey-setting list --limit 10 --offset 0
```

### List pubkeySetting records with cursor pagination

```bash
csdk pubkey-setting list --limit 10 --after <cursor>
```

### Find first matching pubkeySetting

```bash
csdk pubkey-setting find-first --where.id.equalTo <value>
```

### List pubkeySetting records with field selection

```bash
csdk pubkey-setting list --select id,id
```

### List pubkeySetting records with filtering and ordering

```bash
csdk pubkey-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a pubkeySetting

```bash
csdk pubkey-setting create --databaseId <UUID> [--schemaId <UUID>] [--cryptoNetwork <String>] [--userField <String>] [--signUpWithKeyFunctionId <UUID>] [--signInRequestChallengeFunctionId <UUID>] [--signInRecordFailureFunctionId <UUID>] [--signInWithChallengeFunctionId <UUID>]
```

### Get a pubkeySetting by id

```bash
csdk pubkey-setting get --id <value>
```
