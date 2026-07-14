# migrateFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for MigrateFile data operations

## Usage

```typescript
useMigrateFilesQuery({ selection: { fields: { databaseId: true, id: true, upload: true } } })
useMigrateFileQuery({ id: '<UUID>', selection: { fields: { databaseId: true, id: true, upload: true } } })
useCreateMigrateFileMutation({ selection: { fields: { id: true } } })
useUpdateMigrateFileMutation({ selection: { fields: { id: true } } })
useDeleteMigrateFileMutation({})
```

## Examples

### List all migrateFiles

```typescript
const { data, isLoading } = useMigrateFilesQuery({
  selection: { fields: { databaseId: true, id: true, upload: true } },
});
```

### Create a migrateFile

```typescript
const { mutate } = useCreateMigrateFileMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', upload: '<Upload>' });
```
