# appLevelRequirement

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for AppLevelRequirement records via csdk CLI

## Usage

```bash
csdk app-level-requirement list
csdk app-level-requirement get --id <UUID>
csdk app-level-requirement create --name <String> --level <String> [--description <String>] [--requiredCount <Int>] [--priority <Int>]
csdk app-level-requirement update --id <UUID> [--name <String>] [--level <String>] [--description <String>] [--requiredCount <Int>] [--priority <Int>]
csdk app-level-requirement delete --id <UUID>
```

## Examples

### List all appLevelRequirement records

```bash
csdk app-level-requirement list
```

### Create a appLevelRequirement

```bash
csdk app-level-requirement create --name <String> --level <String> [--description <String>] [--requiredCount <Int>] [--priority <Int>]
```

### Get a appLevelRequirement by id

```bash
csdk app-level-requirement get --id <value>
```
