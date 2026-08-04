# fieldBehavior

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FieldBehavior records via csdk CLI

## Usage

```bash
csdk field-behavior list
csdk field-behavior list --where.<field>.<op> <value> --orderBy <values>
csdk field-behavior list --limit 10 --after <cursor>
csdk field-behavior find-first --where.<field>.<op> <value>
csdk field-behavior get --id <UUID>
csdk field-behavior create --fieldId <UUID> --scope <String> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
csdk field-behavior update --id <UUID> [--databaseId <UUID>] [--fieldId <UUID>] [--modifier <String>] [--scope <String>] [--sortOrder <Int>]
csdk field-behavior delete --id <UUID>
```

## Examples

### List fieldBehavior records

```bash
csdk field-behavior list
```

### List fieldBehavior records with pagination

```bash
csdk field-behavior list --limit 10 --offset 0
```

### List fieldBehavior records with cursor pagination

```bash
csdk field-behavior list --limit 10 --after <cursor>
```

### Find first matching fieldBehavior

```bash
csdk field-behavior find-first --where.id.equalTo <value>
```

### List fieldBehavior records with field selection

```bash
csdk field-behavior list --select id,id
```

### List fieldBehavior records with filtering and ordering

```bash
csdk field-behavior list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a fieldBehavior

```bash
csdk field-behavior create --fieldId <UUID> --scope <String> [--databaseId <UUID>] [--modifier <String>] [--sortOrder <Int>]
```

### Get a fieldBehavior by id

```bash
csdk field-behavior get --id <value>
```
