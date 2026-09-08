# platformK8sResourceKind

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformK8sResourceKind records via csdk CLI

## Usage

```bash
csdk platform-k-8-s-resource-kind list
csdk platform-k-8-s-resource-kind list --where.<field>.<op> <value> --orderBy <values>
csdk platform-k-8-s-resource-kind list --limit 10 --after <cursor>
csdk platform-k-8-s-resource-kind find-first --where.<field>.<op> <value>
csdk platform-k-8-s-resource-kind get --id <UUID>
csdk platform-k-8-s-resource-kind create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
csdk platform-k-8-s-resource-kind update --id <UUID> [--active <Boolean>] [--commitId <UUID>] [--definition <JSON>] [--description <String>] [--label <String>] [--slug <String>] [--storeId <UUID>]
csdk platform-k-8-s-resource-kind delete --id <UUID>
```

## Examples

### List platformK8sResourceKind records

```bash
csdk platform-k-8-s-resource-kind list
```

### List platformK8sResourceKind records with pagination

```bash
csdk platform-k-8-s-resource-kind list --limit 10 --offset 0
```

### List platformK8sResourceKind records with cursor pagination

```bash
csdk platform-k-8-s-resource-kind list --limit 10 --after <cursor>
```

### Find first matching platformK8sResourceKind

```bash
csdk platform-k-8-s-resource-kind find-first --where.id.equalTo <value>
```

### List platformK8sResourceKind records with field selection

```bash
csdk platform-k-8-s-resource-kind list --select id,id
```

### List platformK8sResourceKind records with filtering and ordering

```bash
csdk platform-k-8-s-resource-kind list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformK8sResourceKind

```bash
csdk platform-k-8-s-resource-kind create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
```

### Get a platformK8sResourceKind by id

```bash
csdk platform-k-8-s-resource-kind get --id <value>
```
