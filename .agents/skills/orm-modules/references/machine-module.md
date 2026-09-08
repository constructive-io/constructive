# machineModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for MachineModule records

## Usage

```typescript
db.machineModule.findMany({ select: { id: true } }).execute()
db.machineModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.machineModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', machineMessagesTableId: '<UUID>', machineMessagesTableName: '<String>', machineSessionsTableId: '<UUID>', machineSessionsTableName: '<String>', machinesTableId: '<UUID>', machinesTableName: '<String>', partitionInterval: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' }, select: { id: true } }).execute()
db.machineModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.machineModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all machineModule records

```typescript
const items = await db.machineModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a machineModule

```typescript
const item = await db.machineModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', machineMessagesTableId: '<UUID>', machineMessagesTableName: '<String>', machineSessionsTableId: '<UUID>', machineSessionsTableName: '<String>', machinesTableId: '<UUID>', machinesTableName: '<String>', partitionInterval: '<String>', policies: '<JSON>', prefix: '<String>', premake: '<Int>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', retention: '<String>', schemaId: '<UUID>', scope: '<String>' },
  select: { id: true }
}).execute();
```
