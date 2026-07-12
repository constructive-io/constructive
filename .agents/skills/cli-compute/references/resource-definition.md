# resourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceDefinition records via csdk CLI

## Usage

```bash
csdk resource-definition list
csdk resource-definition list --where.<field>.<op> <value> --orderBy <values>
csdk resource-definition list --limit 10 --after <cursor>
csdk resource-definition find-first --where.<field>.<op> <value>
csdk resource-definition get --id <UUID>
csdk resource-definition create --namespaceId <UUID> --kind <String> --name <String> --slug <String> --databaseId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>]
csdk resource-definition update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--namespaceId <UUID>] [--kind <String>] [--name <String>] [--slug <String>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>] [--databaseId <UUID>]
csdk resource-definition delete --id <UUID>
```

## Examples

### List resourceDefinition records

```bash
csdk resource-definition list
```

### List resourceDefinition records with pagination

```bash
csdk resource-definition list --limit 10 --offset 0
```

### List resourceDefinition records with cursor pagination

```bash
csdk resource-definition list --limit 10 --after <cursor>
```

### Find first matching resourceDefinition

```bash
csdk resource-definition find-first --where.id.equalTo <value>
```

### List resourceDefinition records with field selection

```bash
csdk resource-definition list --select id,id
```

### List resourceDefinition records with filtering and ordering

```bash
csdk resource-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceDefinition

```bash
csdk resource-definition create --namespaceId <UUID> --kind <String> --name <String> --slug <String> --databaseId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>]
```

### Get a resourceDefinition by id

```bash
csdk resource-definition get --id <value>
```
