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
csdk blueprint create --ownerId <UUID> --databaseId <UUID> --name <String> --displayName <String> --definition <JSON> [--description <String>] [--templateId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint update --id <UUID> [--ownerId <UUID>] [--databaseId <UUID>] [--name <String>] [--displayName <String>] [--description <String>] [--definition <JSON>] [--templateId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
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
csdk blueprint create --ownerId <UUID> --databaseId <UUID> --name <String> --displayName <String> --definition <JSON> [--description <String>] [--templateId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
```

### Get a blueprint by id

```bash
csdk blueprint get --id <value>
```
