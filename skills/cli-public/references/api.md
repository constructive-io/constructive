# api

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Api records via csdk CLI

## Usage

```bash
csdk api list
csdk api get --id <value>
csdk api create --databaseId <value> --name <value> --nameTrgmSimilarity <value> --dbnameTrgmSimilarity <value> --roleNameTrgmSimilarity <value> --anonRoleTrgmSimilarity <value> --searchScore <value> [--dbname <value>] [--roleName <value>] [--anonRole <value>] [--isPublic <value>]
csdk api update --id <value> [--databaseId <value>] [--name <value>] [--dbname <value>] [--roleName <value>] [--anonRole <value>] [--isPublic <value>] [--nameTrgmSimilarity <value>] [--dbnameTrgmSimilarity <value>] [--roleNameTrgmSimilarity <value>] [--anonRoleTrgmSimilarity <value>] [--searchScore <value>]
csdk api delete --id <value>
```

## Examples

### List all api records

```bash
csdk api list
```

### Create a api

```bash
csdk api create --databaseId <value> --name <value> --nameTrgmSimilarity <value> --dbnameTrgmSimilarity <value> --roleNameTrgmSimilarity <value> --anonRoleTrgmSimilarity <value> --searchScore <value> [--dbname <value>] [--roleName <value>] [--anonRole <value>] [--isPublic <value>]
```

### Get a api by id

```bash
csdk api get --id <value>
```
