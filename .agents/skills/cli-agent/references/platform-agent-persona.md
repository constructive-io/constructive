# platformAgentPersona

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentPersona records via csdk CLI

## Usage

```bash
csdk platform-agent-persona list
csdk platform-agent-persona list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-persona list --limit 10 --after <cursor>
csdk platform-agent-persona find-first --where.<field>.<op> <value>
csdk platform-agent-persona get --id <UUID>
csdk platform-agent-persona create --name <String> --slug <String> [--config <JSON>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isActive <Boolean>] [--resources <String>] [--systemPrompt <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-agent-persona update --id <UUID> [--config <JSON>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isActive <Boolean>] [--name <String>] [--resources <String>] [--slug <String>] [--systemPrompt <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-agent-persona delete --id <UUID>
```

## Examples

### List platformAgentPersona records

```bash
csdk platform-agent-persona list
```

### List platformAgentPersona records with pagination

```bash
csdk platform-agent-persona list --limit 10 --offset 0
```

### List platformAgentPersona records with cursor pagination

```bash
csdk platform-agent-persona list --limit 10 --after <cursor>
```

### Find first matching platformAgentPersona

```bash
csdk platform-agent-persona find-first --where.id.equalTo <value>
```

### List platformAgentPersona records with field selection

```bash
csdk platform-agent-persona list --select id,id
```

### List platformAgentPersona records with filtering and ordering

```bash
csdk platform-agent-persona list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentPersona

```bash
csdk platform-agent-persona create --name <String> --slug <String> [--config <JSON>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isActive <Boolean>] [--resources <String>] [--systemPrompt <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformAgentPersona by id

```bash
csdk platform-agent-persona get --id <value>
```
