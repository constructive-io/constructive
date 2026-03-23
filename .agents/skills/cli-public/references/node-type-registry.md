# nodeTypeRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for NodeTypeRegistry records via csdk CLI

## Usage

```bash
csdk node-type-registry list
csdk node-type-registry get --name <String>
csdk node-type-registry create --slug <String> --category <String> [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
csdk node-type-registry update --name <String> [--slug <String>] [--category <String>] [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
csdk node-type-registry delete --name <String>
```

## Examples

### List all nodeTypeRegistry records

```bash
csdk node-type-registry list
```

### Create a nodeTypeRegistry

```bash
csdk node-type-registry create --slug <String> --category <String> [--displayName <String>] [--description <String>] [--parameterSchema <JSON>] [--tags <String>]
```

### Get a nodeTypeRegistry by name

```bash
csdk node-type-registry get --name <value>
```
