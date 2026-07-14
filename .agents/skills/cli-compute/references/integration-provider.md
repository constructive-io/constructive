# integrationProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for IntegrationProvider records via csdk CLI

## Usage

```bash
csdk integration-provider list
csdk integration-provider list --where.<field>.<op> <value> --orderBy <values>
csdk integration-provider list --limit 10 --after <cursor>
csdk integration-provider find-first --where.<field>.<op> <value>
csdk integration-provider get --id <UUID>
csdk integration-provider create --name <String> --slug <String> [--brand <JSON>] [--category <String>] [--description <String>] [--icon <String>] [--logo <Image>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>]
csdk integration-provider update --id <UUID> [--brand <JSON>] [--category <String>] [--description <String>] [--icon <String>] [--logo <Image>] [--name <String>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>] [--slug <String>]
csdk integration-provider delete --id <UUID>
```

## Examples

### List integrationProvider records

```bash
csdk integration-provider list
```

### List integrationProvider records with pagination

```bash
csdk integration-provider list --limit 10 --offset 0
```

### List integrationProvider records with cursor pagination

```bash
csdk integration-provider list --limit 10 --after <cursor>
```

### Find first matching integrationProvider

```bash
csdk integration-provider find-first --where.id.equalTo <value>
```

### List integrationProvider records with field selection

```bash
csdk integration-provider list --select id,id
```

### List integrationProvider records with filtering and ordering

```bash
csdk integration-provider list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a integrationProvider

```bash
csdk integration-provider create --name <String> --slug <String> [--brand <JSON>] [--category <String>] [--description <String>] [--icon <String>] [--logo <Image>] [--requiredConfigs <ResourceRequirement>] [--requiredSecrets <ResourceRequirement>]
```

### Get a integrationProvider by id

```bash
csdk integration-provider get --id <value>
```
