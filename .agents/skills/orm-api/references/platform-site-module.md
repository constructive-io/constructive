# platformSiteModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Frontend module configuration for a site surface; stores module name and JSON settings

## Usage

```typescript
db.platformSiteModule.findMany({ select: { id: true } }).execute()
db.platformSiteModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformSiteModule.create({ data: { data: '<JSON>', isEnabled: '<Boolean>', name: '<String>', position: '<Int>', siteId: '<UUID>' }, select: { id: true } }).execute()
db.platformSiteModule.update({ where: { id: '<UUID>' }, data: { data: '<JSON>' }, select: { id: true } }).execute()
db.platformSiteModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformSiteModule records

```typescript
const items = await db.platformSiteModule.findMany({
  select: { id: true, data: true }
}).execute();
```

### Create a platformSiteModule

```typescript
const item = await db.platformSiteModule.create({
  data: { data: '<JSON>', isEnabled: '<Boolean>', name: '<String>', position: '<Int>', siteId: '<UUID>' },
  select: { id: true }
}).execute();
```
