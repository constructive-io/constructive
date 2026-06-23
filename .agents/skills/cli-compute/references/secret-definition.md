# secretDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for SecretDefinition records via csdk CLI

## Usage

```bash
csdk secret-definition list
csdk secret-definition list --where.<field>.<op> <value> --orderBy <values>
csdk secret-definition list --limit 10 --after <cursor>
csdk secret-definition find-first --where.<field>.<op> <value>
csdk secret-definition get --id <UUID>
csdk secret-definition create --name <String> --databaseId <UUID> [--description <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>]
csdk secret-definition update --id <UUID> [--name <String>] [--description <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>] [--databaseId <UUID>]
csdk secret-definition delete --id <UUID>
```

## Examples

### List secretDefinition records

```bash
csdk secret-definition list
```

### List secretDefinition records with pagination

```bash
csdk secret-definition list --limit 10 --offset 0
```

### List secretDefinition records with cursor pagination

```bash
csdk secret-definition list --limit 10 --after <cursor>
```

### Find first matching secretDefinition

```bash
csdk secret-definition find-first --where.id.equalTo <value>
```

### List secretDefinition records with field selection

```bash
csdk secret-definition list --select id,id
```

### List secretDefinition records with filtering and ordering

```bash
csdk secret-definition list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a secretDefinition

```bash
csdk secret-definition create --name <String> --databaseId <UUID> [--description <String>] [--isBuiltIn <Boolean>] [--labels <JSON>] [--annotations <JSON>]
```

### Get a secretDefinition by id

```bash
csdk secret-definition get --id <value>
```
