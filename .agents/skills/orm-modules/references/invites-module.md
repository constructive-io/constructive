# invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InvitesModule records

## Usage

```typescript
db.invitesModule.findMany({ select: { id: true } }).execute()
db.invitesModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.invitesModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' }, select: { id: true } }).execute()
db.invitesModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.invitesModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all invitesModule records

```typescript
const items = await db.invitesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a invitesModule

```typescript
const item = await db.invitesModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', emailsTableId: '<UUID>', usersTableId: '<UUID>', invitesTableId: '<UUID>', claimedInvitesTableId: '<UUID>', invitesTableName: '<String>', claimedInvitesTableName: '<String>', submitInviteCodeFunction: '<String>', scope: '<String>', prefix: '<String>', entityTableId: '<UUID>', apiName: '<String>', privateApiName: '<String>' },
  select: { id: true }
}).execute();
```
