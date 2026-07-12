# platformResourceDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceDefinition records via csdk CLI

## Usage

```bash
csdk platform-resource-definition list
csdk platform-resource-definition list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-definition list --limit 10 --after <cursor>
csdk platform-resource-definition find-first --where.<field>.<op> <value>
csdk platform-resource-definition get --id <UUID>
csdk platform-resource-definition create --namespaceId <UUID> --kind <String> --name <String> --slug <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>]
csdk platform-resource-definition update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--namespaceId <UUID>] [--kind <String>] [--name <String>] [--slug <String>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>]
csdk platform-resource-definition delete --id <UUID>
```

## Examples

### List platformResourceDefinition records

```bash
csdk platform-resource-definition list
```

### List platformResourceDefinition records with pagination

```bash
csdk platform-resource-definition list --limit 10 --offset 0
```

### List platformResourceDefinition records with cursor pagination

```bash
csdk platform-resource-definition list --limit 10 --after <cursor>
```

### Find first matching platformResourceDefinition

```bash
csdk platform-resource-definition find-first --where.id.equalTo <value>
```

### List platformResourceDefinition records with field selection

```bash
csdk platform-resource-definition list --select id,id
```

### List platformResourceDefinition records with filtering and ordering

```bash
csdk platform-resource-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceDefinition

```bash
csdk platform-resource-definition create --namespaceId <UUID> --kind <String> --name <String> --slug <String> [--createdBy <UUID>] [--updatedBy <UUID>] [--description <String>] [--defaultSpec <JSON>] [--requiredSecrets <ResourceRequirement>] [--requiredConfigs <ResourceRequirement>] [--integrations <String>] [--labels <JSON>] [--annotations <JSON>] [--stepUpMinAge <Interval>]
```

### Get a platformResourceDefinition by id

```bash
csdk platform-resource-definition get --id <value>
```
