# orm-invitesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for InvitesModule records

## Usage

```typescript
db.invitesModule.findMany({ select: { id: true } }).execute()
db.invitesModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.invitesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', emailsTableId: '<value>', usersTableId: '<value>', invitesTableId: '<value>', claimedInvitesTableId: '<value>', invitesTableName: '<value>', claimedInvitesTableName: '<value>', submitInviteCodeFunction: '<value>', prefix: '<value>', membershipType: '<value>', entityTableId: '<value>' }, select: { id: true } }).execute()
db.invitesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.invitesModule.delete({ where: { id: '<value>' } }).execute()
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
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', emailsTableId: 'value', usersTableId: 'value', invitesTableId: 'value', claimedInvitesTableId: 'value', invitesTableName: 'value', claimedInvitesTableName: 'value', submitInviteCodeFunction: 'value', prefix: 'value', membershipType: 'value', entityTableId: 'value' },
  select: { id: true }
}).execute();
```
