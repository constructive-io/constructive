# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for User records via app CLI

## Usage

```bash
app user list
app user get --id <value>
app user create --username <value> --displayName <value> --profilePicture <value> --searchTsv <value> --type <value> --searchTsvRank <value>
app user update --id <value> [--username <value>] [--displayName <value>] [--profilePicture <value>] [--searchTsv <value>] [--type <value>] [--searchTsvRank <value>]
app user delete --id <value>
```

## Examples

### List all user records

```bash
app user list
```

### Create a user

```bash
app user create --username "value" --displayName "value" --profilePicture "value" --searchTsv "value" --type "value" --searchTsvRank "value"
```

### Get a user by id

```bash
app user get --id <value>
```
