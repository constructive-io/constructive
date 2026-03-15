# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for User records via csdk CLI

## Usage

```bash
csdk user list
csdk user get --id <value>
csdk user create --searchTsvRank <value> --displayNameTrgmSimilarity <value> --searchScore <value> [--username <value>] [--displayName <value>] [--profilePicture <value>] [--searchTsv <value>] [--type <value>]
csdk user update --id <value> [--username <value>] [--displayName <value>] [--profilePicture <value>] [--searchTsv <value>] [--type <value>] [--searchTsvRank <value>] [--displayNameTrgmSimilarity <value>] [--searchScore <value>]
csdk user delete --id <value>
```

## Examples

### List all user records

```bash
csdk user list
```

### Create a user

```bash
csdk user create --searchTsvRank <value> --displayNameTrgmSimilarity <value> --searchScore <value> [--username <value>] [--displayName <value>] [--profilePicture <value>] [--searchTsv <value>] [--type <value>]
```

### Get a user by id

```bash
csdk user get --id <value>
```
