# membershipTypesModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MembershipTypesModule records

## Usage

```typescript
db.membershipTypesModule.findMany({ select: { id: true } }).execute()
db.membershipTypesModule.findOne({ id: '<value>', select: { id: true } }).execute()
db.membershipTypesModule.create({ data: { databaseId: '<value>', schemaId: '<value>', tableId: '<value>', tableName: '<value>', tableNameTrgmSimilarity: '<value>', searchScore: '<value>' }, select: { id: true } }).execute()
db.membershipTypesModule.update({ where: { id: '<value>' }, data: { databaseId: '<new>' }, select: { id: true } }).execute()
db.membershipTypesModule.delete({ where: { id: '<value>' } }).execute()
```

## Examples

### List all membershipTypesModule records

```typescript
const items = await db.membershipTypesModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a membershipTypesModule

```typescript
const item = await db.membershipTypesModule.create({
  data: { databaseId: 'value', schemaId: 'value', tableId: 'value', tableName: 'value', tableNameTrgmSimilarity: 'value', searchScore: 'value' },
  select: { id: true }
}).execute();
```
