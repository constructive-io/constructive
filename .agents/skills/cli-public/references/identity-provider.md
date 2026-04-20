# identityProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for IdentityProvider records via csdk CLI

## Usage

```bash
csdk identity-provider list
csdk identity-provider list --where.<field>.<op> <value> --orderBy <values>
csdk identity-provider list --limit 10 --after <cursor>
csdk identity-provider find-first --where.<field>.<op> <value>
csdk identity-provider get --id <UUID>
csdk identity-provider create [--slug <String>] [--kind <String>] [--displayName <String>] [--enabled <Boolean>] [--isBuiltIn <Boolean>]
csdk identity-provider update --id <UUID> [--slug <String>] [--kind <String>] [--displayName <String>] [--enabled <Boolean>] [--isBuiltIn <Boolean>]
csdk identity-provider delete --id <UUID>
```

## Examples

### List identityProvider records

```bash
csdk identity-provider list
```

### List identityProvider records with pagination

```bash
csdk identity-provider list --limit 10 --offset 0
```

### List identityProvider records with cursor pagination

```bash
csdk identity-provider list --limit 10 --after <cursor>
```

### Find first matching identityProvider

```bash
csdk identity-provider find-first --where.id.equalTo <value>
```

### List identityProvider records with field selection

```bash
csdk identity-provider list --select id,id
```

### List identityProvider records with filtering and ordering

```bash
csdk identity-provider list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a identityProvider

```bash
csdk identity-provider create [--slug <String>] [--kind <String>] [--displayName <String>] [--enabled <Boolean>] [--isBuiltIn <Boolean>]
```

### Get a identityProvider by id

```bash
csdk identity-provider get --id <value>
```
