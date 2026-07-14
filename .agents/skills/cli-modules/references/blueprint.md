# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Blueprint records via csdk CLI

## Usage

```bash
csdk blueprint list
csdk blueprint list --where.<field>.<op> <value> --orderBy <values>
csdk blueprint list --limit 10 --after <cursor>
csdk blueprint find-first --where.<field>.<op> <value>
csdk blueprint get --id <UUID>
csdk blueprint create --databaseId <UUID> --definition <JSON> --displayName <String> --name <String> --ownerId <UUID> [--definitionHash <UUID>] [--description <String>] [--tableHashes <JSON>] [--templateId <UUID>]
csdk blueprint update --id <UUID> [--databaseId <UUID>] [--definition <JSON>] [--definitionHash <UUID>] [--description <String>] [--displayName <String>] [--name <String>] [--ownerId <UUID>] [--tableHashes <JSON>] [--templateId <UUID>]
csdk blueprint delete --id <UUID>
```

## Examples

### List blueprint records

```bash
csdk blueprint list
```

### List blueprint records with pagination

```bash
csdk blueprint list --limit 10 --offset 0
```

### List blueprint records with cursor pagination

```bash
csdk blueprint list --limit 10 --after <cursor>
```

### Find first matching blueprint

```bash
csdk blueprint find-first --where.id.equalTo <value>
```

### List blueprint records with field selection

```bash
csdk blueprint list --select id,id
```

### List blueprint records with filtering and ordering

```bash
csdk blueprint list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a blueprint

```bash
csdk blueprint create --databaseId <UUID> --definition <JSON> --displayName <String> --name <String> --ownerId <UUID> [--definitionHash <UUID>] [--description <String>] [--tableHashes <JSON>] [--templateId <UUID>]
```

### Get a blueprint by id

```bash
csdk blueprint get --id <value>
```
