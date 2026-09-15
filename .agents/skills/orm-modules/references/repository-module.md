# repositoryModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM operations for RepositoryModule records

## Usage

```typescript
db.repositoryModule.findMany({ select: { id: true } }).execute()
db.repositoryModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.repositoryModule.create({ data: { apiName: '<String>', buildStepsTableId: '<UUID>', buildStepsTableName: '<String>', buildsTableId: '<UUID>', buildsTableName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAttachments: '<Boolean>', hasBuilds: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', proposalCommentsTableId: '<UUID>', proposalCommentsTableName: '<String>', proposalFileViewsTableId: '<UUID>', proposalFileViewsTableName: '<String>', proposalReactionsTableId: '<UUID>', proposalReactionsTableName: '<String>', proposalReviewsTableId: '<UUID>', proposalReviewsTableName: '<String>', proposalsTableId: '<UUID>', proposalsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', repositoriesTableId: '<UUID>', repositoriesTableName: '<String>', repositoryEventsTableId: '<UUID>', repositoryEventsTableName: '<String>', repositoryRequiredChecksTableId: '<UUID>', repositoryRequiredChecksTableName: '<String>', schemaId: '<UUID>', scope: '<String>', search: '<JSON>', workflowsTableId: '<UUID>', workflowsTableName: '<String>' }, select: { id: true } }).execute()
db.repositoryModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.repositoryModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all repositoryModule records

```typescript
const items = await db.repositoryModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a repositoryModule

```typescript
const item = await db.repositoryModule.create({
  data: { apiName: '<String>', buildStepsTableId: '<UUID>', buildStepsTableName: '<String>', buildsTableId: '<UUID>', buildsTableName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAttachments: '<Boolean>', hasBuilds: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', proposalCommentsTableId: '<UUID>', proposalCommentsTableName: '<String>', proposalFileViewsTableId: '<UUID>', proposalFileViewsTableName: '<String>', proposalReactionsTableId: '<UUID>', proposalReactionsTableName: '<String>', proposalReviewsTableId: '<UUID>', proposalReviewsTableName: '<String>', proposalsTableId: '<UUID>', proposalsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', repositoriesTableId: '<UUID>', repositoriesTableName: '<String>', repositoryEventsTableId: '<UUID>', repositoryEventsTableName: '<String>', repositoryRequiredChecksTableId: '<UUID>', repositoryRequiredChecksTableName: '<String>', schemaId: '<UUID>', scope: '<String>', search: '<JSON>', workflowsTableId: '<UUID>', workflowsTableName: '<String>' },
  select: { id: true }
}).execute();
```
