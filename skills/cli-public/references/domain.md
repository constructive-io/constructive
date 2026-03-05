# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Domain records via app CLI

## Usage

```bash
app domain list
app domain get --id <value>
app domain create --databaseId <value> --apiId <value> --siteId <value> --subdomain <value> --domain <value>
app domain update --id <value> [--databaseId <value>] [--apiId <value>] [--siteId <value>] [--subdomain <value>] [--domain <value>]
app domain delete --id <value>
```

## Examples

### List all domain records

```bash
app domain list
```

### Create a domain

```bash
app domain create --databaseId "value" --apiId "value" --siteId "value" --subdomain "value" --domain "value"
```

### Get a domain by id

```bash
app domain get --id <value>
```
