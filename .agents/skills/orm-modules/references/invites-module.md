# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InvitesModule records

## Usage

```typescript
db.invitesModule.findMany({ select: { id: true } }).execute()
db.invitesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.invitesModule.create({ data: { apiName: '<String>', claimedInvitesTableId: '<UUID>', claimedInvitesTableName: '<String>', databaseId: '<UUID>', emailsTableId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', invitesTableId: '<UUID>', invitesTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', submitInviteCodeFunction: '<String>', usersTableId: '<UUID>' }, select: { id: true } }).execute()
db.invitesModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.invitesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all invitesModule records

```typescript
const items = await db.invitesModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a invitesModule

```typescript
const item = await db.invitesModule.create({
  data: { apiName: '<String>', claimedInvitesTableId: '<UUID>', claimedInvitesTableName: '<String>', databaseId: '<UUID>', emailsTableId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', invitesTableId: '<UUID>', invitesTableName: '<String>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', publicSchemaName: '<String>', schemaId: '<UUID>', scope: '<String>', submitInviteCodeFunction: '<String>', usersTableId: '<UUID>' },
  select: { id: true }
}).execute();
```
