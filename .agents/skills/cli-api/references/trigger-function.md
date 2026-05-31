# triggerFunction

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for TriggerFunction records via csdk CLI

## Usage

```bash
csdk trigger-function list
csdk trigger-function list --where.<field>.<op> <value> --orderBy <values>
csdk trigger-function list --limit 10 --after <cursor>
csdk trigger-function find-first --where.<field>.<op> <value>
csdk trigger-function get --id <UUID>
csdk trigger-function create --databaseId <UUID> --name <String> [--code <String>]
csdk trigger-function update --id <UUID> [--databaseId <UUID>] [--name <String>] [--code <String>]
csdk trigger-function delete --id <UUID>
```

## Examples

### List triggerFunction records

```bash
csdk trigger-function list
```

### List triggerFunction records with pagination

```bash
csdk trigger-function list --limit 10 --offset 0
```

### List triggerFunction records with cursor pagination

```bash
csdk trigger-function list --limit 10 --after <cursor>
```

### Find first matching triggerFunction

```bash
csdk trigger-function find-first --where.id.equalTo <value>
```

### List triggerFunction records with field selection

```bash
csdk trigger-function list --select id,id
```

### List triggerFunction records with filtering and ordering

```bash
csdk trigger-function list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a triggerFunction

```bash
csdk trigger-function create --databaseId <UUID> --name <String> [--code <String>]
```

### Get a triggerFunction by id

```bash
csdk trigger-function get --id <value>
```
