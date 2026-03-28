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
csdk blueprint-template create --name <String> --displayName <String> --ownerId <UUID> --definition <JSON> [--version <String>] [--description <String>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint-template update --id <UUID> [--name <String>] [--version <String>] [--displayName <String>] [--description <String>] [--ownerId <UUID>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definition <JSON>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
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
csdk blueprint-template create --name <String> --displayName <String> --ownerId <UUID> --definition <JSON> [--version <String>] [--description <String>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
```

### Get a blueprintTemplate by id

```bash
csdk blueprint-template get --id <value>
```
