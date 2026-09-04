# userSettingsSecurity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for UserSettingsSecurity records via csdk CLI

## Usage

```bash
csdk user-settings-security list
csdk user-settings-security list --where.<field>.<op> <value> --orderBy <values>
csdk user-settings-security list --limit 10 --after <cursor>
csdk user-settings-security find-first --where.<field>.<op> <value>
csdk user-settings-security get --id <UUID>
csdk user-settings-security create [--backupCodesCount <Int>] [--emailMfaEnabled <Boolean>] [--mfaEnrolledAt <Datetime>] [--mfaLastUsedAt <Datetime>] [--ownerId <UUID>] [--smsMfaEnabled <Boolean>] [--totpEnabled <Boolean>]
csdk user-settings-security update --id <UUID> [--backupCodesCount <Int>] [--emailMfaEnabled <Boolean>] [--mfaEnrolledAt <Datetime>] [--mfaLastUsedAt <Datetime>] [--ownerId <UUID>] [--smsMfaEnabled <Boolean>] [--totpEnabled <Boolean>]
csdk user-settings-security delete --id <UUID>
```

## Examples

### List userSettingsSecurity records

```bash
csdk user-settings-security list
```

### List userSettingsSecurity records with pagination

```bash
csdk user-settings-security list --limit 10 --offset 0
```

### List userSettingsSecurity records with cursor pagination

```bash
csdk user-settings-security list --limit 10 --after <cursor>
```

### Find first matching userSettingsSecurity

```bash
csdk user-settings-security find-first --where.id.equalTo <value>
```

### List userSettingsSecurity records with field selection

```bash
csdk user-settings-security list --select id,id
```

### List userSettingsSecurity records with filtering and ordering

```bash
csdk user-settings-security list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a userSettingsSecurity

```bash
csdk user-settings-security create [--backupCodesCount <Int>] [--emailMfaEnabled <Boolean>] [--mfaEnrolledAt <Datetime>] [--mfaLastUsedAt <Datetime>] [--ownerId <UUID>] [--smsMfaEnabled <Boolean>] [--totpEnabled <Boolean>]
```

### Get a userSettingsSecurity by id

```bash
csdk user-settings-security get --id <value>
```
