# resolveBlueprintField

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Resolves a field_name within a given table_id to a field_id. Throws if no match is found. Used by construct_blueprint to translate user-authored field names (e.g. "location") into field UUIDs for downstream provisioning procedures. table_id must already be resolved (via resolve_blueprint_table) before calling this.

## Usage

```bash
csdk resolve-blueprint-field --databaseId <UUID> --tableId <UUID> --fieldName <String>
```

## Examples

### Run resolveBlueprintField

```bash
csdk resolve-blueprint-field --databaseId <UUID> --tableId <UUID> --fieldName <String>
```
