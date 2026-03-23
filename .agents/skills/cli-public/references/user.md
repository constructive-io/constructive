# user

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for User records via csdk CLI

**Unified Search API fields:** `displayNameTrgmSimilarity`, `searchScore`
Fields provided by the Unified Search plugin. Includes full-text search (tsvector/BM25), trigram similarity scores, and the combined searchScore. Computed fields are read-only and cannot be set in create/update operations.

## Usage

```bash
csdk user list
csdk user get --id <UUID>
csdk user create [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
csdk user update --id <UUID> [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
csdk user delete --id <UUID>
```

## Examples

### List all user records

```bash
csdk user list
```

### Create a user

```bash
csdk user create [--username <String>] [--displayName <String>] [--profilePicture <Image>] [--type <Int>]
```

### Get a user by id

```bash
csdk user get --id <value>
```
