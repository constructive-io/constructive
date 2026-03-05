# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated.

## Usage

```typescript
useDatabaseProvisionModulesQuery({ selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } } })
useDatabaseProvisionModuleQuery({ id: '<value>', selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } } })
useCreateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseProvisionModuleMutation({})
```

## Examples

### List all databaseProvisionModules

```typescript
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true } },
});
```

### Create a databaseProvisionModule

```typescript
const { mutate } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseName: '<value>', ownerId: '<value>', subdomain: '<value>', domain: '<value>', modules: '<value>', options: '<value>', bootstrapUser: '<value>', status: '<value>', errorMessage: '<value>', databaseId: '<value>', completedAt: '<value>' });
```
