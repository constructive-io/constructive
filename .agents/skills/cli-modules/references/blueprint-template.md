# blueprintTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BlueprintTemplate records via csdk CLI

## Usage

```bash
csdk blueprint-template list
csdk blueprint-template list --where.<field>.<op> <value> --orderBy <values>
csdk blueprint-template list --limit 10 --after <cursor>
csdk blueprint-template find-first --where.<field>.<op> <value>
csdk blueprint-template get --id <UUID>
csdk blueprint-template create --definition <JSON> --displayName <String> --name <String> --ownerId <UUID> [--categories <String>] [--complexity <String>] [--copyCount <Int>] [--definitionHash <UUID>] [--definitionSchemaVersion <String>] [--description <String>] [--forkCount <Int>] [--forkedFromId <UUID>] [--source <String>] [--tableHashes <JSON>] [--tags <String>] [--version <String>] [--visibility <String>]
csdk blueprint-template update --id <UUID> [--categories <String>] [--complexity <String>] [--copyCount <Int>] [--definition <JSON>] [--definitionHash <UUID>] [--definitionSchemaVersion <String>] [--description <String>] [--displayName <String>] [--forkCount <Int>] [--forkedFromId <UUID>] [--name <String>] [--ownerId <UUID>] [--source <String>] [--tableHashes <JSON>] [--tags <String>] [--version <String>] [--visibility <String>]
csdk blueprint-template delete --id <UUID>
```

## Examples

### List blueprintTemplate records

```bash
csdk blueprint-template list
```

### List blueprintTemplate records with pagination

```bash
csdk blueprint-template list --limit 10 --offset 0
```

### List blueprintTemplate records with cursor pagination

```bash
csdk blueprint-template list --limit 10 --after <cursor>
```

### Find first matching blueprintTemplate

```bash
csdk blueprint-template find-first --where.id.equalTo <value>
```

### List blueprintTemplate records with field selection

```bash
csdk blueprint-template list --select id,id
```

### List blueprintTemplate records with filtering and ordering

```bash
csdk blueprint-template list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a blueprintTemplate

```bash
csdk blueprint-template create --definition <JSON> --displayName <String> --name <String> --ownerId <UUID> [--categories <String>] [--complexity <String>] [--copyCount <Int>] [--definitionHash <UUID>] [--definitionSchemaVersion <String>] [--description <String>] [--forkCount <Int>] [--forkedFromId <UUID>] [--source <String>] [--tableHashes <JSON>] [--tags <String>] [--version <String>] [--visibility <String>]
```

### Get a blueprintTemplate by id

```bash
csdk blueprint-template get --id <value>
```
