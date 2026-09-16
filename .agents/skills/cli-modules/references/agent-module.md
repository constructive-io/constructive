# agentModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentModule records via csdk CLI

## Usage

```bash
csdk agent-module list
csdk agent-module list --where.<field>.<op> <value> --orderBy <values>
csdk agent-module list --limit 10 --after <cursor>
csdk agent-module find-first --where.<field>.<op> <value>
csdk agent-module get --id <UUID>
csdk agent-module create --databaseId <UUID> --scope <String> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--defaultCapabilities <String>] [--defaultVisibility <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventTableId <UUID>] [--eventTableName <String>] [--hasAgents <Boolean>] [--hasAttachments <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasRuns <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--runTableId <UUID>] [--runTableName <String>] [--schemaId <UUID>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>] [--workspaceTableId <UUID>] [--workspaceTableName <String>]
csdk agent-module update --id <UUID> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--databaseId <UUID>] [--defaultCapabilities <String>] [--defaultVisibility <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventTableId <UUID>] [--eventTableName <String>] [--hasAgents <Boolean>] [--hasAttachments <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasRuns <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--runTableId <UUID>] [--runTableName <String>] [--schemaId <UUID>] [--scope <String>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>] [--workspaceTableId <UUID>] [--workspaceTableName <String>]
csdk agent-module delete --id <UUID>
```

## Examples

### List agentModule records

```bash
csdk agent-module list
```

### List agentModule records with pagination

```bash
csdk agent-module list --limit 10 --offset 0
```

### List agentModule records with cursor pagination

```bash
csdk agent-module list --limit 10 --after <cursor>
```

### Find first matching agentModule

```bash
csdk agent-module find-first --where.id.equalTo <value>
```

### List agentModule records with field selection

```bash
csdk agent-module list --select id,id
```

### List agentModule records with filtering and ordering

```bash
csdk agent-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentModule

```bash
csdk agent-module create --databaseId <UUID> --scope <String> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--defaultCapabilities <String>] [--defaultVisibility <String>] [--entityField <String>] [--entityTableId <UUID>] [--eventTableId <UUID>] [--eventTableName <String>] [--hasAgents <Boolean>] [--hasAttachments <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasRuns <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--runTableId <UUID>] [--runTableName <String>] [--schemaId <UUID>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>] [--workspaceTableId <UUID>] [--workspaceTableName <String>]
```

### Get a agentModule by id

```bash
csdk agent-module get --id <value>
```
