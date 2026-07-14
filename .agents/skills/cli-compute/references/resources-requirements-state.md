# resourcesRequirementsState

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for ResourcesRequirementsState records via csdk CLI

## Usage

```bash
csdk resources-requirements-state list
csdk resources-requirements-state list --where.<field>.<op> <value> --orderBy <values>
csdk resources-requirements-state list --limit 10 --after <cursor>
csdk resources-requirements-state find-first --where.<field>.<op> <value>
csdk resources-requirements-state get --id <UUID>
csdk resources-requirements-state create --configHash <String> --configObjectName <String> --requirementsHash <String> --resourceId <UUID> --secretsHash <String> --secretsObjectName <String> --slug <String>
csdk resources-requirements-state update --id <UUID> [--configHash <String>] [--configObjectName <String>] [--requirementsHash <String>] [--resourceId <UUID>] [--secretsHash <String>] [--secretsObjectName <String>] [--slug <String>]
csdk resources-requirements-state delete --id <UUID>
```

## Examples

### List resourcesRequirementsState records

```bash
csdk resources-requirements-state list
```

### List resourcesRequirementsState records with pagination

```bash
csdk resources-requirements-state list --limit 10 --offset 0
```

### List resourcesRequirementsState records with cursor pagination

```bash
csdk resources-requirements-state list --limit 10 --after <cursor>
```

### Find first matching resourcesRequirementsState

```bash
csdk resources-requirements-state find-first --where.id.equalTo <value>
```

### List resourcesRequirementsState records with field selection

```bash
csdk resources-requirements-state list --select id,id
```

### List resourcesRequirementsState records with filtering and ordering

```bash
csdk resources-requirements-state list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a resourcesRequirementsState

```bash
csdk resources-requirements-state create --configHash <String> --configObjectName <String> --requirementsHash <String> --resourceId <UUID> --secretsHash <String> --secretsObjectName <String> --slug <String>
```

### Get a resourcesRequirementsState by id

```bash
csdk resources-requirements-state get --id <value>
```
