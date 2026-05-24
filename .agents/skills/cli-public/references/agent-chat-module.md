# agentChatModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AgentChatModule records via csdk CLI

## Usage

```bash
csdk agent-chat-module list
csdk agent-chat-module list --where.<field>.<op> <value> --orderBy <values>
csdk agent-chat-module list --limit 10 --after <cursor>
csdk agent-chat-module find-first --where.<field>.<op> <value>
csdk agent-chat-module get --id <UUID>
csdk agent-chat-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--apiId <UUID>] [--threadTableId <UUID>] [--threadTableName <String>] [--messageTableId <UUID>] [--messageTableName <String>] [--taskTableId <UUID>] [--taskTableName <String>] [--prefix <String>]
csdk agent-chat-module update --id <UUID> [--databaseId <UUID>] [--schemaId <UUID>] [--privateSchemaId <UUID>] [--apiId <UUID>] [--threadTableId <UUID>] [--threadTableName <String>] [--messageTableId <UUID>] [--messageTableName <String>] [--taskTableId <UUID>] [--taskTableName <String>] [--prefix <String>]
csdk agent-chat-module delete --id <UUID>
```

## Examples

### List agentChatModule records

```bash
csdk agent-chat-module list
```

### List agentChatModule records with pagination

```bash
csdk agent-chat-module list --limit 10 --offset 0
```

### List agentChatModule records with cursor pagination

```bash
csdk agent-chat-module list --limit 10 --after <cursor>
```

### Find first matching agentChatModule

```bash
csdk agent-chat-module find-first --where.id.equalTo <value>
```

### List agentChatModule records with field selection

```bash
csdk agent-chat-module list --select id,id
```

### List agentChatModule records with filtering and ordering

```bash
csdk agent-chat-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a agentChatModule

```bash
csdk agent-chat-module create --databaseId <UUID> [--schemaId <UUID>] [--privateSchemaId <UUID>] [--apiId <UUID>] [--threadTableId <UUID>] [--threadTableName <String>] [--messageTableId <UUID>] [--messageTableName <String>] [--taskTableId <UUID>] [--taskTableName <String>] [--prefix <String>]
```

### Get a agentChatModule by id

```bash
csdk agent-chat-module get --id <value>
```
