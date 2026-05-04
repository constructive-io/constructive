# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for NodeTypeRegistry records via csdk CLI

## Usage

```bash
csdk node-type-registry list
csdk node-type-registry list --where.<field>.<op> <value> --orderBy <values>
csdk node-type-registry list --limit 10 --after <cursor>
csdk node-type-registry find-first --where.<field>.<op> <value>
csdk node-type-registry get --name <String>
csdk node-type-registry create --slug <String> --category <String> [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
csdk node-type-registry update --name <String> [--slug <String>] [--category <String>] [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
csdk node-type-registry delete --name <String>
```

## Examples

### List nodeTypeRegistry records

```bash
csdk node-type-registry list
```

### List nodeTypeRegistry records with pagination

```bash
csdk node-type-registry list --limit 10 --offset 0
```

### List nodeTypeRegistry records with cursor pagination

```bash
csdk node-type-registry list --limit 10 --after <cursor>
```

### Find first matching nodeTypeRegistry

```bash
csdk node-type-registry find-first --where.name.equalTo <value>
```

### List nodeTypeRegistry records with field selection

```bash
csdk node-type-registry list --select id,name
```

### List nodeTypeRegistry records with filtering and ordering

```bash
csdk node-type-registry list --where.name.equalTo <value> --orderBy NAME_ASC
```

### Create a nodeTypeRegistry

```bash
csdk node-type-registry create --slug <String> --category <String> [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
```

### Get a nodeTypeRegistry by name

```bash
csdk node-type-registry get --name <value>
```
