# dataCapabilitiesField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for DataCapabilitiesField records via csdk CLI

## Usage

```bash
csdk data-capabilities-field list
csdk data-capabilities-field list --where.<field>.<op> <value> --orderBy <values>
csdk data-capabilities-field list --limit 10 --after <cursor>
csdk data-capabilities-field find-first --where.<field>.<op> <value>
csdk data-capabilities-field get --id <UUID>
csdk data-capabilities-field create --capabilitiesModuleId <UUID> --databaseId <UUID> --fieldId <UUID> --tableId <UUID> [--fromFieldId <UUID>] [--mappingFieldId <UUID>] [--mappingKeyFieldId <UUID>] [--mappingTableId <UUID>] [--mode <String>] [--subsetGuard <Boolean>]
csdk data-capabilities-field update --id <UUID> [--capabilitiesModuleId <UUID>] [--databaseId <UUID>] [--fieldId <UUID>] [--fromFieldId <UUID>] [--mappingFieldId <UUID>] [--mappingKeyFieldId <UUID>] [--mappingTableId <UUID>] [--mode <String>] [--subsetGuard <Boolean>] [--tableId <UUID>]
csdk data-capabilities-field delete --id <UUID>
```

## Examples

### List dataCapabilitiesField records

```bash
csdk data-capabilities-field list
```

### List dataCapabilitiesField records with pagination

```bash
csdk data-capabilities-field list --limit 10 --offset 0
```

### List dataCapabilitiesField records with cursor pagination

```bash
csdk data-capabilities-field list --limit 10 --after <cursor>
```

### Find first matching dataCapabilitiesField

```bash
csdk data-capabilities-field find-first --where.id.equalTo <value>
```

### List dataCapabilitiesField records with field selection

```bash
csdk data-capabilities-field list --select id,id
```

### List dataCapabilitiesField records with filtering and ordering

```bash
csdk data-capabilities-field list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a dataCapabilitiesField

```bash
csdk data-capabilities-field create --capabilitiesModuleId <UUID> --databaseId <UUID> --fieldId <UUID> --tableId <UUID> [--fromFieldId <UUID>] [--mappingFieldId <UUID>] [--mappingKeyFieldId <UUID>] [--mappingTableId <UUID>] [--mode <String>] [--subsetGuard <Boolean>]
```

### Get a dataCapabilitiesField by id

```bash
csdk data-capabilities-field get --id <value>
```
