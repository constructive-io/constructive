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
csdk platform-resource-definition create --kind <String> --name <String> --namespaceId <UUID> --slug <String> [--annotations <JSON>] [--createdBy <UUID>] [--defaultSpec <JSON>] [--description <String>] [--integrations <String>] [--labels <JSON>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--stepUpMinAge <Interval>] [--updatedBy <UUID>]
csdk platform-resource-definition update --id <UUID> [--annotations <JSON>] [--createdBy <UUID>] [--defaultSpec <JSON>] [--description <String>] [--integrations <String>] [--kind <String>] [--labels <JSON>] [--name <String>] [--namespaceId <UUID>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--slug <String>] [--stepUpMinAge <Interval>] [--updatedBy <UUID>]
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
csdk platform-resource-definition create --kind <String> --name <String> --namespaceId <UUID> --slug <String> [--annotations <JSON>] [--createdBy <UUID>] [--defaultSpec <JSON>] [--description <String>] [--integrations <String>] [--labels <JSON>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--stepUpMinAge <Interval>] [--updatedBy <UUID>]
```

### Get a platformResourceDefinition by id

```bash
csdk platform-resource-definition get --id <value>
```
