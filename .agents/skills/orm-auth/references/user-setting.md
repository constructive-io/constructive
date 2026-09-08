# userSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-user settings and preferences. Extended by other modules (i18n, notifications, MFA) via metaschema.create_field().

## Usage

```typescript
db.userSetting.findMany({ select: { id: true } }).execute()
db.userSetting.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.userSetting.create({ data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.userSetting.update({ where: { id: '<UUID>' }, data: { ownerId: '<UUID>' }, select: { id: true } }).execute()
db.userSetting.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all userSetting records

```typescript
const items = await db.userSetting.findMany({
  select: { id: true, ownerId: true }
}).execute();
```

### Create a userSetting

```typescript
const item = await db.userSetting.create({
  data: { ownerId: '<UUID>' },
  select: { id: true }
}).execute();
```
