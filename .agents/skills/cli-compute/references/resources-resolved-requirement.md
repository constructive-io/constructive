# resourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourcesResolvedRequirement records via csdk CLI

## Usage

```bash
csdk resources-resolved-requirement list
csdk resources-resolved-requirement list --where.<field>.<op> <value> --orderBy <values>
csdk resources-resolved-requirement list --limit 10 --after <cursor>
csdk resources-resolved-requirement find-first --where.<field>.<op> <value>
csdk resources-resolved-requirement get --id <UUID>
csdk resources-resolved-requirement create --atomId <UUID> --configObjectName <String> --name <String> --namespaceId <UUID> --present <Boolean> --required <Boolean> --requirementKind <String> --resourceId <UUID> --secretsObjectName <String> --slug <String>
csdk resources-resolved-requirement update --id <UUID> [--atomId <UUID>] [--configObjectName <String>] [--name <String>] [--namespaceId <UUID>] [--present <Boolean>] [--required <Boolean>] [--requirementKind <String>] [--resourceId <UUID>] [--secretsObjectName <String>] [--slug <String>]
csdk resources-resolved-requirement delete --id <UUID>
```

## Examples

### List resourcesResolvedRequirement records

```bash
csdk resources-resolved-requirement list
```

### List resourcesResolvedRequirement records with pagination

```bash
csdk resources-resolved-requirement list --limit 10 --offset 0
```

### List resourcesResolvedRequirement records with cursor pagination

```bash
csdk resources-resolved-requirement list --limit 10 --after <cursor>
```

### Find first matching resourcesResolvedRequirement

```bash
csdk resources-resolved-requirement find-first --where.id.equalTo <value>
```

### List resourcesResolvedRequirement records with field selection

```bash
csdk resources-resolved-requirement list --select id,id
```

### List resourcesResolvedRequirement records with filtering and ordering

```bash
csdk resources-resolved-requirement list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourcesResolvedRequirement

```bash
csdk resources-resolved-requirement create --atomId <UUID> --configObjectName <String> --name <String> --namespaceId <UUID> --present <Boolean> --required <Boolean> --requirementKind <String> --resourceId <UUID> --secretsObjectName <String> --slug <String>
```

### Get a resourcesResolvedRequirement by id

```bash
csdk resources-resolved-requirement get --id <value>
```
