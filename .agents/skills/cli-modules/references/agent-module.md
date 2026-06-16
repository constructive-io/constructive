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
csdk agent-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--threadTableId <UUID>] [--messageTableId <UUID>] [--taskTableId <UUID>] [--promptsTableId <UUID>] [--planTableId <UUID>] [--agentTableId <UUID>] [--personaTableId <UUID>] [--resourceTableId <UUID>] [--threadTableName <String>] [--messageTableName <String>] [--taskTableName <String>] [--promptsTableName <String>] [--planTableName <String>] [--agentTableName <String>] [--personaTableName <String>] [--resourceTableName <String>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasAgents <Boolean>] [--shared <Boolean>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--resources <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
csdk agent-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--threadTableId <UUID>] [--messageTableId <UUID>] [--taskTableId <UUID>] [--promptsTableId <UUID>] [--planTableId <UUID>] [--agentTableId <UUID>] [--personaTableId <UUID>] [--resourceTableId <UUID>] [--threadTableName <String>] [--messageTableName <String>] [--taskTableName <String>] [--promptsTableName <String>] [--planTableName <String>] [--agentTableName <String>] [--personaTableName <String>] [--resourceTableName <String>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasAgents <Boolean>] [--shared <Boolean>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--resources <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
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
csdk agent-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--publicSchemaName <String>] [--privateSchemaName <String>] [--threadTableId <UUID>] [--messageTableId <UUID>] [--taskTableId <UUID>] [--promptsTableId <UUID>] [--planTableId <UUID>] [--agentTableId <UUID>] [--personaTableId <UUID>] [--resourceTableId <UUID>] [--threadTableName <String>] [--messageTableName <String>] [--taskTableName <String>] [--promptsTableName <String>] [--planTableName <String>] [--agentTableName <String>] [--personaTableName <String>] [--resourceTableName <String>] [--hasPlans <Boolean>] [--hasResources <Boolean>] [--hasAgents <Boolean>] [--shared <Boolean>] [--apiName <String>] [--privateApiName <String>] [--scope <String>] [--prefix <String>] [--entityTableId <UUID>] [--policies <JSON>] [--resources <JSON>] [--provisions <JSON>] [--defaultPermissions <String>]
```

### Get a agentModule by id

```bash
csdk agent-module get --id <value>
```
