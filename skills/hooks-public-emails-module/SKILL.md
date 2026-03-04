---
name: hooks-public-emails-module
description: React Query hooks for EmailsModule data operations
---

# hooks-public-emails-module

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for EmailsModule data operations

## Usage

```typescript
useEmailsModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
useEmailsModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } } })
useCreateEmailsModuleMutation({ selection: { fields: { id: true } } })
useUpdateEmailsModuleMutation({ selection: { fields: { id: true } } })
useDeleteEmailsModuleMutation({})
```

## Examples

### List all emailsModules

```typescript
const { data, isLoading } = useEmailsModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, ownerTableId: true, tableName: true } },
});
```

### Create a emailsModule

```typescript
const { mutate } = useCreateEmailsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<value>', schemaId: '<value>', privateSchemaId: '<value>', tableId: '<value>', ownerTableId: '<value>', tableName: '<value>' });
```
