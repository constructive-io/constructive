# platformK8sSpecRule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformK8sSpecRule records via csdk CLI

## Usage

```bash
csdk platform-k-8-s-spec-rule list
csdk platform-k-8-s-spec-rule list --where.<field>.<op> <value> --orderBy <values>
csdk platform-k-8-s-spec-rule list --limit 10 --after <cursor>
csdk platform-k-8-s-spec-rule find-first --where.<field>.<op> <value>
csdk platform-k-8-s-spec-rule get --id <UUID>
csdk platform-k-8-s-spec-rule create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
csdk platform-k-8-s-spec-rule update --id <UUID> [--active <Boolean>] [--commitId <UUID>] [--definition <JSON>] [--description <String>] [--label <String>] [--slug <String>] [--storeId <UUID>]
csdk platform-k-8-s-spec-rule delete --id <UUID>
```

## Examples

### List platformK8sSpecRule records

```bash
csdk platform-k-8-s-spec-rule list
```

### List platformK8sSpecRule records with pagination

```bash
csdk platform-k-8-s-spec-rule list --limit 10 --offset 0
```

### List platformK8sSpecRule records with cursor pagination

```bash
csdk platform-k-8-s-spec-rule list --limit 10 --after <cursor>
```

### Find first matching platformK8sSpecRule

```bash
csdk platform-k-8-s-spec-rule find-first --where.id.equalTo <value>
```

### List platformK8sSpecRule records with field selection

```bash
csdk platform-k-8-s-spec-rule list --select id,id
```

### List platformK8sSpecRule records with filtering and ordering

```bash
csdk platform-k-8-s-spec-rule list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformK8sSpecRule

```bash
csdk platform-k-8-s-spec-rule create --definition <JSON> --slug <String> [--active <Boolean>] [--commitId <UUID>] [--description <String>] [--label <String>] [--storeId <UUID>]
```

### Get a platformK8sSpecRule by id

```bash
csdk platform-k-8-s-spec-rule get --id <value>
```
