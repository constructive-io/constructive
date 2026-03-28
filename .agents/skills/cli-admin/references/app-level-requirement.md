# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLevelRequirement records via csdk CLI

## Usage

```bash
csdk app-level-requirement list
csdk app-level-requirement list --where.<field>.<op> <value> --orderBy <values>
csdk app-level-requirement list --limit 10 --after <cursor>
csdk app-level-requirement find-first --where.<field>.<op> <value>
csdk app-level-requirement get --id <UUID>
csdk app-level-requirement create --name <String> --level <String> [--description <String>] [--requiredCount <Int>] [--priority <Int>]
csdk app-level-requirement update --id <UUID> [--name <String>] [--level <String>] [--description <String>] [--requiredCount <Int>] [--priority <Int>]
csdk app-level-requirement delete --id <UUID>
```

## Examples

### List appLevelRequirement records

```bash
csdk app-level-requirement list
```

### List appLevelRequirement records with pagination

```bash
csdk app-level-requirement list --limit 10 --offset 0
```

### List appLevelRequirement records with cursor pagination

```bash
csdk app-level-requirement list --limit 10 --after <cursor>
```

### Find first matching appLevelRequirement

```bash
csdk app-level-requirement find-first --where.id.equalTo <value>
```

### List appLevelRequirement records with field selection

```bash
csdk app-level-requirement list --select id,id
```

### List appLevelRequirement records with filtering and ordering

```bash
csdk app-level-requirement list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a appLevelRequirement

```bash
csdk app-level-requirement create --name <String> --level <String> [--description <String>] [--requiredCount <Int>] [--priority <Int>]
```

### Get a appLevelRequirement by id

```bash
csdk app-level-requirement get --id <value>
```
