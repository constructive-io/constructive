# identityProviderRegistry

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for IdentityProviderRegistry records via csdk CLI

## Usage

```bash
csdk identity-provider-registry list
csdk identity-provider-registry list --where.<field>.<op> <value> --orderBy <values>
csdk identity-provider-registry list --limit 10 --after <cursor>
csdk identity-provider-registry find-first --where.<field>.<op> <value>
csdk identity-provider-registry get --slug <String>
csdk identity-provider-registry create --displayName <String> --kind <String> [--authorizationUrl <String>] [--issuerUrl <String>] [--scopes <String>] [--tokenUrl <String>] [--userinfoUrl <String>]
csdk identity-provider-registry update --slug <String> [--authorizationUrl <String>] [--displayName <String>] [--issuerUrl <String>] [--kind <String>] [--scopes <String>] [--tokenUrl <String>] [--userinfoUrl <String>]
csdk identity-provider-registry delete --slug <String>
```

## Examples

### List identityProviderRegistry records

```bash
csdk identity-provider-registry list
```

### List identityProviderRegistry records with pagination

```bash
csdk identity-provider-registry list --limit 10 --offset 0
```

### List identityProviderRegistry records with cursor pagination

```bash
csdk identity-provider-registry list --limit 10 --after <cursor>
```

### Find first matching identityProviderRegistry

```bash
csdk identity-provider-registry find-first --where.slug.equalTo <value>
```

### List identityProviderRegistry records with field selection

```bash
csdk identity-provider-registry list --select id,slug
```

### List identityProviderRegistry records with filtering and ordering

```bash
csdk identity-provider-registry list --where.slug.equalTo <value> --orderBy SLUG_ASC
```

### Create a identityProviderRegistry

```bash
csdk identity-provider-registry create --displayName <String> --kind <String> [--authorizationUrl <String>] [--issuerUrl <String>] [--scopes <String>] [--tokenUrl <String>] [--userinfoUrl <String>]
```

### Get a identityProviderRegistry by slug

```bash
csdk identity-provider-registry get --slug <value>
```
