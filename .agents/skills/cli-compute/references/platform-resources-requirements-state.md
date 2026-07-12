# platformResourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformResourcesRequirementsState records via csdk CLI

## Usage

```bash
csdk platform-resources-requirements-state list
csdk platform-resources-requirements-state list --where.<field>.<op> <value> --orderBy <values>
csdk platform-resources-requirements-state list --limit 10 --after <cursor>
csdk platform-resources-requirements-state find-first --where.<field>.<op> <value>
csdk platform-resources-requirements-state get --id <UUID>
csdk platform-resources-requirements-state create --resourceId <UUID> --slug <String> --secretsHash <String> --configHash <String> --requirementsHash <String> --secretsObjectName <String> --configObjectName <String>
csdk platform-resources-requirements-state update --id <UUID> [--resourceId <UUID>] [--slug <String>] [--secretsHash <String>] [--configHash <String>] [--requirementsHash <String>] [--secretsObjectName <String>] [--configObjectName <String>]
csdk platform-resources-requirements-state delete --id <UUID>
```

## Examples

### List platformResourcesRequirementsState records

```bash
csdk platform-resources-requirements-state list
```

### List platformResourcesRequirementsState records with pagination

```bash
csdk platform-resources-requirements-state list --limit 10 --offset 0
```

### List platformResourcesRequirementsState records with cursor pagination

```bash
csdk platform-resources-requirements-state list --limit 10 --after <cursor>
```

### Find first matching platformResourcesRequirementsState

```bash
csdk platform-resources-requirements-state find-first --where.id.equalTo <value>
```

### List platformResourcesRequirementsState records with field selection

```bash
csdk platform-resources-requirements-state list --select id,id
```

### List platformResourcesRequirementsState records with filtering and ordering

```bash
csdk platform-resources-requirements-state list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformResourcesRequirementsState

```bash
csdk platform-resources-requirements-state create --resourceId <UUID> --slug <String> --secretsHash <String> --configHash <String> --requirementsHash <String> --secretsObjectName <String> --configObjectName <String>
```

### Get a platformResourcesRequirementsState by id

```bash
csdk platform-resources-requirements-state get --id <value>
```
