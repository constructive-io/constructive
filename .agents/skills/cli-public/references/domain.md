# domain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Domain records via csdk CLI

## Usage

```bash
csdk domain list
csdk domain get --id <UUID>
csdk domain create --databaseId <UUID> [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
csdk domain update --id <UUID> [--databaseId <UUID>] [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
csdk domain delete --id <UUID>
```

## Examples

### List all domain records

```bash
csdk domain list
```

### Create a domain

```bash
csdk domain create --databaseId <UUID> [--apiId <UUID>] [--siteId <UUID>] [--subdomain <Hostname>] [--domain <Hostname>]
```

### Get a domain by id

```bash
csdk domain get --id <value>
```
