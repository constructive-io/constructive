# platformAgentPrompt

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformAgentPrompt records via csdk CLI

## Usage

```bash
csdk platform-agent-prompt list
csdk platform-agent-prompt list --where.<field>.<op> <value> --orderBy <values>
csdk platform-agent-prompt list --limit 10 --after <cursor>
csdk platform-agent-prompt find-first --where.<field>.<op> <value>
csdk platform-agent-prompt get --id <UUID>
csdk platform-agent-prompt create --content <String> --name <String> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-agent-prompt update --id <UUID> [--content <String>] [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--name <String>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
csdk platform-agent-prompt delete --id <UUID>
```

## Examples

### List platformAgentPrompt records

```bash
csdk platform-agent-prompt list
```

### List platformAgentPrompt records with pagination

```bash
csdk platform-agent-prompt list --limit 10 --offset 0
```

### List platformAgentPrompt records with cursor pagination

```bash
csdk platform-agent-prompt list --limit 10 --after <cursor>
```

### Find first matching platformAgentPrompt

```bash
csdk platform-agent-prompt find-first --where.id.equalTo <value>
```

### List platformAgentPrompt records with field selection

```bash
csdk platform-agent-prompt list --select id,id
```

### List platformAgentPrompt records with filtering and ordering

```bash
csdk platform-agent-prompt list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformAgentPrompt

```bash
csdk platform-agent-prompt create --content <String> --name <String> [--createdBy <UUID>] [--createdByPrincipal <UUID>] [--description <String>] [--isDefault <Boolean>] [--metadata <JSON>] [--updatedBy <UUID>] [--updatedByPrincipal <UUID>]
```

### Get a platformAgentPrompt by id

```bash
csdk platform-agent-prompt get --id <value>
```
