# repositoryModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for RepositoryModule data operations

## Usage

```typescript
useRepositoryModulesQuery({ selection: { fields: { apiName: true, buildStepsTableId: true, buildStepsTableName: true, buildsTableId: true, buildsTableName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, hasAttachments: true, hasBuilds: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, proposalCommentsTableId: true, proposalCommentsTableName: true, proposalFileViewsTableId: true, proposalFileViewsTableName: true, proposalReactionsTableId: true, proposalReactionsTableName: true, proposalReviewsTableId: true, proposalReviewsTableName: true, proposalsTableId: true, proposalsTableName: true, provisions: true, publicSchemaName: true, repositoriesTableId: true, repositoriesTableName: true, repositoryEventsTableId: true, repositoryEventsTableName: true, repositoryRequiredChecksTableId: true, repositoryRequiredChecksTableName: true, schemaId: true, scope: true, search: true, workflowsTableId: true, workflowsTableName: true } } })
useRepositoryModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, buildStepsTableId: true, buildStepsTableName: true, buildsTableId: true, buildsTableName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, hasAttachments: true, hasBuilds: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, proposalCommentsTableId: true, proposalCommentsTableName: true, proposalFileViewsTableId: true, proposalFileViewsTableName: true, proposalReactionsTableId: true, proposalReactionsTableName: true, proposalReviewsTableId: true, proposalReviewsTableName: true, proposalsTableId: true, proposalsTableName: true, provisions: true, publicSchemaName: true, repositoriesTableId: true, repositoriesTableName: true, repositoryEventsTableId: true, repositoryEventsTableName: true, repositoryRequiredChecksTableId: true, repositoryRequiredChecksTableName: true, schemaId: true, scope: true, search: true, workflowsTableId: true, workflowsTableName: true } } })
useCreateRepositoryModuleMutation({ selection: { fields: { id: true } } })
useUpdateRepositoryModuleMutation({ selection: { fields: { id: true } } })
useDeleteRepositoryModuleMutation({})
```

## Examples

### List all repositoryModules

```typescript
const { data, isLoading } = useRepositoryModulesQuery({
  selection: { fields: { apiName: true, buildStepsTableId: true, buildStepsTableName: true, buildsTableId: true, buildsTableName: true, databaseId: true, defaultCapabilities: true, entityField: true, entityTableId: true, hasAttachments: true, hasBuilds: true, id: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, proposalCommentsTableId: true, proposalCommentsTableName: true, proposalFileViewsTableId: true, proposalFileViewsTableName: true, proposalReactionsTableId: true, proposalReactionsTableName: true, proposalReviewsTableId: true, proposalReviewsTableName: true, proposalsTableId: true, proposalsTableName: true, provisions: true, publicSchemaName: true, repositoriesTableId: true, repositoriesTableName: true, repositoryEventsTableId: true, repositoryEventsTableName: true, repositoryRequiredChecksTableId: true, repositoryRequiredChecksTableName: true, schemaId: true, scope: true, search: true, workflowsTableId: true, workflowsTableName: true } },
});
```

### Create a repositoryModule

```typescript
const { mutate } = useCreateRepositoryModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', buildStepsTableId: '<UUID>', buildStepsTableName: '<String>', buildsTableId: '<UUID>', buildsTableName: '<String>', databaseId: '<UUID>', defaultCapabilities: '<String>', entityField: '<String>', entityTableId: '<UUID>', hasAttachments: '<Boolean>', hasBuilds: '<Boolean>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', proposalCommentsTableId: '<UUID>', proposalCommentsTableName: '<String>', proposalFileViewsTableId: '<UUID>', proposalFileViewsTableName: '<String>', proposalReactionsTableId: '<UUID>', proposalReactionsTableName: '<String>', proposalReviewsTableId: '<UUID>', proposalReviewsTableName: '<String>', proposalsTableId: '<UUID>', proposalsTableName: '<String>', provisions: '<JSON>', publicSchemaName: '<String>', repositoriesTableId: '<UUID>', repositoriesTableName: '<String>', repositoryEventsTableId: '<UUID>', repositoryEventsTableName: '<String>', repositoryRequiredChecksTableId: '<UUID>', repositoryRequiredChecksTableName: '<String>', schemaId: '<UUID>', scope: '<String>', search: '<JSON>', workflowsTableId: '<UUID>', workflowsTableName: '<String>' });
```
