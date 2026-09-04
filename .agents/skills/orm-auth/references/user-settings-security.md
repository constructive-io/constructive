# userSettingsSecurity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user security settings for MFA configuration (separate from user_settings preferences)

## Usage

```typescript
db.userSettingsSecurity.findMany({ select: { id: true } }).execute()
db.userSettingsSecurity.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userSettingsSecurity.create({ data: { backupCodesCount: '<Int>', emailMfaEnabled: '<Boolean>', mfaEnrolledAt: '<Datetime>', mfaLastUsedAt: '<Datetime>', ownerId: '<UUID>', smsMfaEnabled: '<Boolean>', totpEnabled: '<Boolean>' }, select: { id: true } }).execute()
db.userSettingsSecurity.update({ where: { id: '<UUID>' }, data: { backupCodesCount: '<Int>' }, select: { id: true } }).execute()
db.userSettingsSecurity.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userSettingsSecurity records

```typescript
const items = await db.userSettingsSecurity.findMany({
  select: { id: true, backupCodesCount: true }
}).execute();
```

### Create a userSettingsSecurity

```typescript
const item = await db.userSettingsSecurity.create({
  data: { backupCodesCount: '<Int>', emailMfaEnabled: '<Boolean>', mfaEnrolledAt: '<Datetime>', mfaLastUsedAt: '<Datetime>', ownerId: '<UUID>', smsMfaEnabled: '<Boolean>', totpEnabled: '<Boolean>' },
  select: { id: true }
}).execute();
```
