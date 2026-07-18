# resourceInstallation

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourceInstallation records via csdk CLI

## Usage

```bash
csdk resource-installation list
csdk resource-installation list --where.<field>.<op> <value> --orderBy <values>
csdk resource-installation list --limit 10 --after <cursor>
csdk resource-installation find-first --where.<field>.<op> <value>
csdk resource-installation get --id <UUID>
csdk resource-installation create --databaseId <UUID> --name <String> --namespaceId <UUID> --slug <String> [--commitId <UUID>] [--createdBy <UUID>] [--params <JSON>] [--revision <Int>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
csdk resource-installation update --id <UUID> [--commitId <UUID>] [--createdBy <UUID>] [--databaseId <UUID>] [--name <String>] [--namespaceId <UUID>] [--params <JSON>] [--revision <Int>] [--slug <String>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
csdk resource-installation delete --id <UUID>
```

## Examples

### List resourceInstallation records

```bash
csdk resource-installation list
```

### List resourceInstallation records with pagination

```bash
csdk resource-installation list --limit 10 --offset 0
```

### List resourceInstallation records with cursor pagination

```bash
csdk resource-installation list --limit 10 --after <cursor>
```

### Find first matching resourceInstallation

```bash
csdk resource-installation find-first --where.id.equalTo <value>
```

### List resourceInstallation records with field selection

```bash
csdk resource-installation list --select id,id
```

### List resourceInstallation records with filtering and ordering

```bash
csdk resource-installation list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourceInstallation

```bash
csdk resource-installation create --databaseId <UUID> --name <String> --namespaceId <UUID> --slug <String> [--commitId <UUID>] [--createdBy <UUID>] [--params <JSON>] [--revision <Int>] [--status <String>] [--storeId <UUID>] [--updatedBy <UUID>]
```

### Get a resourceInstallation by id

```bash
csdk resource-installation get --id <value>
```
