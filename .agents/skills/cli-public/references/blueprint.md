# blueprint

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Blueprint records via csdk CLI

## Usage

```bash
csdk blueprint list
csdk blueprint get --id <UUID>
csdk blueprint create --ownerId <UUID> --databaseId <UUID> --name <String> --displayName <String> --definition <JSON> [--description <String>] [--templateId <UUID>] [--status <String>] [--constructedAt <Datetime>] [--errorDetails <String>] [--refMap <JSON>] [--constructedDefinition <JSON>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint update --id <UUID> [--ownerId <UUID>] [--databaseId <UUID>] [--name <String>] [--displayName <String>] [--description <String>] [--definition <JSON>] [--templateId <UUID>] [--status <String>] [--constructedAt <Datetime>] [--errorDetails <String>] [--refMap <JSON>] [--constructedDefinition <JSON>] [--definitionHash <UUID>] [--tableHashes <JSON>]
csdk blueprint delete --id <UUID>
```

## Examples

### List all blueprint records

```bash
csdk blueprint list
```

### Create a blueprint

```bash
csdk blueprint create --ownerId <UUID> --databaseId <UUID> --name <String> --displayName <String> --definition <JSON> [--description <String>] [--templateId <UUID>] [--status <String>] [--constructedAt <Datetime>] [--errorDetails <String>] [--refMap <JSON>] [--constructedDefinition <JSON>] [--definitionHash <UUID>] [--tableHashes <JSON>]
```

### Get a blueprint by id

```bash
csdk blueprint get --id <value>
```
