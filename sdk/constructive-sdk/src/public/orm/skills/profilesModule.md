# orm-profilesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for ProfilesModule records

## Usage

```typescript
db.profilesModule.findMany({ select: { id: true } }).execute()
db.profilesModule.findOne({ where: { id: '<value>' }, select: { id: true } }).execute()
db.profilesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', tableName: '<value>', profilePermissionsTableId: '<value>', profilePermissionsTableName: '<value>', profileGrantsTableId: '<value>', profileGrantsTableName: '<value>', profileDefinitionGrantsTableId: '<value>', profileDefinitionGrantsTableName: '<value>', bitlen: '<value>', membershipType: '<value>', entityTableId: '<value>', actorTableId: '<value>', permissionsTableId: '<value>', membershipsTableId: '<value>', prefix: '<value>' }, select: { id: true } }).execute()
db.profilesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.profilesModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all profilesModule records

```typescript
const items = await db.profilesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a profilesModule

```typescript
const item = await db.profilesModule.create({
  data: { databaseId: 'value', schemaId: 'value', privateSchemaId: 'value', tableId: 'value', tableName: 'value', profilePermissionsTableId: 'value', profilePermissionsTableName: 'value', profileGrantsTableId: 'value', profileGrantsTableName: 'value', profileDefinitionGrantsTableId: 'value', profileDefinitionGrantsTableName: 'value', bitlen: 'value', membershipType: 'value', entityTableId: 'value', actorTableId: 'value', permissionsTableId: 'value', membershipsTableId: 'value', prefix: 'value' },
  select: { id: true }
}).execute();
```
