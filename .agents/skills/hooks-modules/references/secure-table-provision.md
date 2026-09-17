# secureTableProvision

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions security, fields, grants, and policies onto a table. Each row can independently: (1) create fields via nodes[] array (supporting multiple Data* modules per row), (2) grant privileges via grants[] array (supporting per-role privilege targeting), (3) create RLS policies via policies[] array (supporting multiple Authz* policies per row). Multiple rows can target the same table to compose different concerns. All three concerns are optional and independent. The target table is addressed by table_id, by table_name, or symbolically by a module reference in module. A row that lists a concern in owns[] replaces that concern on the target table instead of composing with what is already there.

## Usage

```typescript
useSecureTableProvisionsQuery({ selection: { fields: { databaseId: true, fields: true, grants: true, id: true, module: true, nodes: true, outFields: true, owns: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } } })
useSecureTableProvisionQuery({ id: '<UUID>', selection: { fields: { databaseId: true, fields: true, grants: true, id: true, module: true, nodes: true, outFields: true, owns: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } } })
useCreateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useUpdateSecureTableProvisionMutation({ selection: { fields: { id: true } } })
useDeleteSecureTableProvisionMutation({})
```

## Examples

### List all secureTableProvisions

```typescript
const { data, isLoading } = useSecureTableProvisionsQuery({
  selection: { fields: { databaseId: true, fields: true, grants: true, id: true, module: true, nodes: true, outFields: true, owns: true, policies: true, schemaId: true, tableId: true, tableName: true, useRls: true } },
});
```

### Create a secureTableProvision

```typescript
const { mutate } = useCreateSecureTableProvisionMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', fields: '<JSON>', grants: '<JSON>', module: '<JSON>', nodes: '<JSON>', outFields: '<UUID>', owns: '<JSON>', policies: '<JSON>', schemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>', useRls: '<Boolean>' });
```
