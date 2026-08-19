# repositoryModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for RepositoryModule records via csdk CLI

## Usage

```bash
csdk repository-module list
csdk repository-module list --where.<field>.<op> <value> --orderBy <values>
csdk repository-module list --limit 10 --after <cursor>
csdk repository-module find-first --where.<field>.<op> <value>
csdk repository-module get --id <UUID>
csdk repository-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--buildStepsTableId <UUID>] [--buildStepsTableName <String>] [--buildsTableId <UUID>] [--buildsTableName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAttachments <Boolean>] [--hasBuilds <Boolean>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--proposalCommentsTableId <UUID>] [--proposalCommentsTableName <String>] [--proposalFileViewsTableId <UUID>] [--proposalFileViewsTableName <String>] [--proposalReactionsTableId <UUID>] [--proposalReactionsTableName <String>] [--proposalReviewsTableId <UUID>] [--proposalReviewsTableName <String>] [--proposalsTableId <UUID>] [--proposalsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--repositoriesTableId <UUID>] [--repositoriesTableName <String>] [--repositoryEventsTableId <UUID>] [--repositoryEventsTableName <String>] [--schemaId <UUID>] [--search <JSON>] [--workflowsTableId <UUID>] [--workflowsTableName <String>]
csdk repository-module update --id <UUID> [--apiName <String>] [--buildStepsTableId <UUID>] [--buildStepsTableName <String>] [--buildsTableId <UUID>] [--buildsTableName <String>] [--databaseId <UUID>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAttachments <Boolean>] [--hasBuilds <Boolean>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--proposalCommentsTableId <UUID>] [--proposalCommentsTableName <String>] [--proposalFileViewsTableId <UUID>] [--proposalFileViewsTableName <String>] [--proposalReactionsTableId <UUID>] [--proposalReactionsTableName <String>] [--proposalReviewsTableId <UUID>] [--proposalReviewsTableName <String>] [--proposalsTableId <UUID>] [--proposalsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--repositoriesTableId <UUID>] [--repositoriesTableName <String>] [--repositoryEventsTableId <UUID>] [--repositoryEventsTableName <String>] [--schemaId <UUID>] [--scope <String>] [--search <JSON>] [--workflowsTableId <UUID>] [--workflowsTableName <String>]
csdk repository-module delete --id <UUID>
```

## Examples

### List repositoryModule records

```bash
csdk repository-module list
```

### List repositoryModule records with pagination

```bash
csdk repository-module list --limit 10 --offset 0
```

### List repositoryModule records with cursor pagination

```bash
csdk repository-module list --limit 10 --after <cursor>
```

### Find first matching repositoryModule

```bash
csdk repository-module find-first --where.id.equalTo <value>
```

### List repositoryModule records with field selection

```bash
csdk repository-module list --select id,id
```

### List repositoryModule records with filtering and ordering

```bash
csdk repository-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a repositoryModule

```bash
csdk repository-module create --databaseId <UUID> --scope <String> [--apiName <String>] [--buildStepsTableId <UUID>] [--buildStepsTableName <String>] [--buildsTableId <UUID>] [--buildsTableName <String>] [--defaultCapabilities <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAttachments <Boolean>] [--hasBuilds <Boolean>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--proposalCommentsTableId <UUID>] [--proposalCommentsTableName <String>] [--proposalFileViewsTableId <UUID>] [--proposalFileViewsTableName <String>] [--proposalReactionsTableId <UUID>] [--proposalReactionsTableName <String>] [--proposalReviewsTableId <UUID>] [--proposalReviewsTableName <String>] [--proposalsTableId <UUID>] [--proposalsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--repositoriesTableId <UUID>] [--repositoriesTableName <String>] [--repositoryEventsTableId <UUID>] [--repositoryEventsTableName <String>] [--schemaId <UUID>] [--search <JSON>] [--workflowsTableId <UUID>] [--workflowsTableName <String>]
```

### Get a repositoryModule by id

```bash
csdk repository-module get --id <value>
```
