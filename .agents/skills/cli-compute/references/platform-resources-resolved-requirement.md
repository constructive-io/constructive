# platformResourcesResolvedRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourcesResolvedRequirement records via csdk CLI

## Usage

```bash
csdk platform-resources-resolved-requirement list
csdk platform-resources-resolved-requirement list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resources-resolved-requirement list --limit 10 --after <cursor>
csdk platform-resources-resolved-requirement find-first --where.<field>.<op> <value>
csdk platform-resources-resolved-requirement get --id <UUID>
csdk platform-resources-resolved-requirement create --resourceId <UUID> --slug <String> --namespaceId <UUID> --requirementKind <String> --name <String> --required <Boolean> --atomId <UUID> --present <Boolean> --secretsObjectName <String> --configObjectName <String>
csdk platform-resources-resolved-requirement update --id <UUID> [--resourceId <UUID>] [--slug <String>] [--namespaceId <UUID>] [--requirementKind <String>] [--name <String>] [--required <Boolean>] [--atomId <UUID>] [--present <Boolean>] [--secretsObjectName <String>] [--configObjectName <String>]
csdk platform-resources-resolved-requirement delete --id <UUID>
```

## Examples

### List platformResourcesResolvedRequirement records

```bash
csdk platform-resources-resolved-requirement list
```

### List platformResourcesResolvedRequirement records with pagination

```bash
csdk platform-resources-resolved-requirement list --limit 10 --offset 0
```

### List platformResourcesResolvedRequirement records with cursor pagination

```bash
csdk platform-resources-resolved-requirement list --limit 10 --after <cursor>
```

### Find first matching platformResourcesResolvedRequirement

```bash
csdk platform-resources-resolved-requirement find-first --where.id.equalTo <value>
```

### List platformResourcesResolvedRequirement records with field selection

```bash
csdk platform-resources-resolved-requirement list --select id,id
```

### List platformResourcesResolvedRequirement records with filtering and ordering

```bash
csdk platform-resources-resolved-requirement list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourcesResolvedRequirement

```bash
csdk platform-resources-resolved-requirement create --resourceId <UUID> --slug <String> --namespaceId <UUID> --requirementKind <String> --name <String> --required <Boolean> --atomId <UUID> --present <Boolean> --secretsObjectName <String> --configObjectName <String>
```

### Get a platformResourcesResolvedRequirement by id

```bash
csdk platform-resources-resolved-requirement get --id <value>
```
