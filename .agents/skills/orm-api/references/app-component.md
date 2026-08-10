# appComponent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App component rows binding an app to typed catalog rows (exactly one typed component reference per row)

## Usage

```typescript
db.appComponent.findMany({ select: { id: true } }).execute()
db.appComponent.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.appComponent.create({ data: { appId: '<UUID>', componentApiId: '<UUID>', componentDomainId: '<UUID>', componentInstallationId: '<UUID>', componentSiteId: '<UUID>', componentType: '<String>', config: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.appComponent.update({ where: { id: '<UUID>' }, data: { appId: '<UUID>' }, select: { id: true } }).execute()
db.appComponent.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all appComponent records

```typescript
const items = await db.appComponent.findMany({
  select: { id: true, appId: true }
}).execute();
```

### Create a appComponent

```typescript
const item = await db.appComponent.create({
  data: { appId: '<UUID>', componentApiId: '<UUID>', componentDomainId: '<UUID>', componentInstallationId: '<UUID>', componentSiteId: '<UUID>', componentType: '<String>', config: '<JSON>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
