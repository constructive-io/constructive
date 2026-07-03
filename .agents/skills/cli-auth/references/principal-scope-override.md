# principalScopeOverride

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PrincipalScopeOverride records via csdk CLI

## Usage

```bash
csdk principal-scope-override list
csdk principal-scope-override list --where.<field>.<op> <value> --orderBy <values>
csdk principal-scope-override list --limit 10 --after <cursor>
csdk principal-scope-override find-first --where.<field>.<op> <value>
csdk principal-scope-override get --id <UUID>
csdk principal-scope-override create --principalId <UUID> --membershipType <Int> --allowedMask <BitString> --isAdmin <Boolean> --isReadOnly <Boolean>
csdk principal-scope-override update --id <UUID> [--principalId <UUID>] [--membershipType <Int>] [--allowedMask <BitString>] [--isAdmin <Boolean>] [--isReadOnly <Boolean>]
csdk principal-scope-override delete --id <UUID>
```

## Examples

### List principalScopeOverride records

```bash
csdk principal-scope-override list
```

### List principalScopeOverride records with pagination

```bash
csdk principal-scope-override list --limit 10 --offset 0
```

### List principalScopeOverride records with cursor pagination

```bash
csdk principal-scope-override list --limit 10 --after <cursor>
```

### Find first matching principalScopeOverride

```bash
csdk principal-scope-override find-first --where.id.equalTo <value>
```

### List principalScopeOverride records with field selection

```bash
csdk principal-scope-override list --select id,id
```

### List principalScopeOverride records with filtering and ordering

```bash
csdk principal-scope-override list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a principalScopeOverride

```bash
csdk principal-scope-override create --principalId <UUID> --membershipType <Int> --allowedMask <BitString> --isAdmin <Boolean> --isReadOnly <Boolean>
```

### Get a principalScopeOverride by id

```bash
csdk principal-scope-override get --id <value>
```
