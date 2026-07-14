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
csdk agent-module create --databaseId <UUID> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAgents <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--schemaId <UUID>] [--scope <String>] [--shared <Boolean>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>]
csdk agent-module update --id <UUID> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--databaseId <UUID>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAgents <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--schemaId <UUID>] [--scope <String>] [--shared <Boolean>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>]
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
csdk agent-module create --databaseId <UUID> [--agentTableId <UUID>] [--agentTableName <String>] [--apiName <String>] [--defaultPermissions <String>] [--entityField <String>] [--entityTableId <UUID>] [--hasAgents <Boolean>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--messageTableId <UUID>] [--messageTableName <String>] [--personaTableId <UUID>] [--personaTableName <String>] [--planTableId <UUID>] [--planTableName <String>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--promptsTableId <UUID>] [--promptsTableName <String>] [--provisions <JSON>] [--publicSchemaName <String>] [--resourceTableId <UUID>] [--resourceTableName <String>] [--resources <JSON>] [--schemaId <UUID>] [--scope <String>] [--shared <Boolean>] [--taskTableId <UUID>] [--taskTableName <String>] [--threadTableId <UUID>] [--threadTableName <String>]
```

### Get a agentModule by id

```bash
csdk agent-module get --id <value>
```
