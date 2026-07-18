# platformResourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourceInstallation records via csdk CLI

## Usage

```bash
csdk platform-resource-installation list
csdk platform-resource-installation list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resource-installation list --limit 10 --after <cursor>
csdk platform-resource-installation find-first --where.<field>.<op> <value>
csdk platform-resource-installation get --id <UUID>
csdk platform-resource-installation create --name <String> --namespaceId <UUID> --slug <String> [--commitId <UUID>] [--createdBy <UUID>] [--params <JSON>] [--revision <Int>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
csdk platform-resource-installation update --id <UUID> [--commitId <UUID>] [--createdBy <UUID>] [--name <String>] [--namespaceId <UUID>] [--params <JSON>] [--revision <Int>] [--slug <String>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
csdk platform-resource-installation delete --id <UUID>
```

## Examples

### List platformResourceInstallation records

```bash
csdk platform-resource-installation list
```

### List platformResourceInstallation records with pagination

```bash
csdk platform-resource-installation list --limit 10 --offset 0
```

### List platformResourceInstallation records with cursor pagination

```bash
csdk platform-resource-installation list --limit 10 --after <cursor>
```

### Find first matching platformResourceInstallation

```bash
csdk platform-resource-installation find-first --where.id.equalTo <value>
```

### List platformResourceInstallation records with field selection

```bash
csdk platform-resource-installation list --select id,id
```

### List platformResourceInstallation records with filtering and ordering

```bash
csdk platform-resource-installation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourceInstallation

```bash
csdk platform-resource-installation create --name <String> --namespaceId <UUID> --slug <String> [--commitId <UUID>] [--createdBy <UUID>] [--params <JSON>] [--revision <Int>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
```

### Get a platformResourceInstallation by id

```bash
csdk platform-resource-installation get --id <value>
```
