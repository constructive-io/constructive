# functionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for FunctionModule records

## Usage

```typescript
db.functionModule.findMany({ select: { id: true } }).execute()
db.functionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionModule.create({ data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', secretDefinitionsTableId: '<UUID>', requirementsTableId: '<UUID>', configDefinitionsTableId: '<UUID>', configRequirementsTableId: '<UUID>', definitionsTableName: '<String>', invocationsTableName: '<String>', executionLogsTableName: '<String>', secretDefinitionsTableName: '<String>', requirementsTableName: '<String>', configRequirementsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', membershipType: '<Int>', prefix: '<String>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' }, select: { id: true } }).execute()
db.functionModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.functionModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionModule records

```typescript
const items = await db.functionModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a functionModule

```typescript
const item = await db.functionModule.create({
  data: { databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', publicSchemaName: '<String>', privateSchemaName: '<String>', definitionsTableId: '<UUID>', invocationsTableId: '<UUID>', executionLogsTableId: '<UUID>', secretDefinitionsTableId: '<UUID>', requirementsTableId: '<UUID>', configDefinitionsTableId: '<UUID>', configRequirementsTableId: '<UUID>', definitionsTableName: '<String>', invocationsTableName: '<String>', executionLogsTableName: '<String>', secretDefinitionsTableName: '<String>', requirementsTableName: '<String>', configRequirementsTableName: '<String>', apiName: '<String>', privateApiName: '<String>', membershipType: '<Int>', prefix: '<String>', key: '<String>', entityTableId: '<UUID>', policies: '<JSON>', provisions: '<JSON>' },
  select: { id: true }
}).execute();
```
