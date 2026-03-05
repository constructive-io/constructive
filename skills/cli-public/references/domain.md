# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Domain records via csdk CLI

## Usage

```bash
csdk domain list
csdk domain get --id <value>
csdk domain create --databaseId <value> --apiId <value> --siteId <value> --subdomain <value> --domain <value>
csdk domain update --id <value> [--databaseId <value>] [--apiId <value>] [--siteId <value>] [--subdomain <value>] [--domain <value>]
csdk domain delete --id <value>
```

## Examples

### List all domain records

```bash
csdk domain list
```

### Create a domain

```bash
csdk domain create --databaseId "value" --apiId "value" --siteId "value" --subdomain "value" --domain "value"
```

### Get a domain by id

```bash
csdk domain get --id <value>
```
