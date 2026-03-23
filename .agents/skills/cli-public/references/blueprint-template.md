# blueprintTemplate

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for BlueprintTemplate records via csdk CLI

## Usage

```bash
csdk blueprint-template list
csdk blueprint-template get --id <UUID>
csdk blueprint-template create --name <String> --displayName <String> --ownerId <UUID> --definition <JSON> [--version <String>] [--description <String>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint-template update --id <UUID> [--name <String>] [--version <String>] [--displayName <String>] [--description <String>] [--ownerId <UUID>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definition <JSON>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint-template delete --id <UUID>
```

## Examples

### List all blueprintTemplate records

```bash
csdk blueprint-template list
```

### Create a blueprintTemplate

```bash
csdk blueprint-template create --name <String> --displayName <String> --ownerId <UUID> --definition <JSON> [--version <String>] [--description <String>] [--visibility <String>] [--categories <String>] [--tags <String>] [--definitionSchemaVersion <String>] [--source <String>] [--complexity <String>] [--copyCount <Int>] [--forkCount <Int>] [--forkedFromId <UUID>] [--definitionHash <UUID>] [--tableHashes <JSON>]
```

### Get a blueprintTemplate by id

```bash
csdk blueprint-template get --id <value>
```
