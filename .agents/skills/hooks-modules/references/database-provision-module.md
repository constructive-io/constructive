# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated.

## Usage

```typescript
useDatabaseProvisionModulesQuery({ selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, sourceDatabaseId: true, bootstrapStatus: true, bootstrapError: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, fulfilledAt: true } } })
useDatabaseProvisionModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, sourceDatabaseId: true, bootstrapStatus: true, bootstrapError: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, fulfilledAt: true } } })
useCreateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseProvisionModuleMutation({})
```

## Examples

### List all databaseProvisionModules

```typescript
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { id: true, databaseName: true, ownerId: true, subdomain: true, domain: true, modules: true, options: true, bootstrapUser: true, status: true, errorMessage: true, sourceDatabaseId: true, bootstrapStatus: true, bootstrapError: true, databaseId: true, createdAt: true, updatedAt: true, completedAt: true, fulfilledAt: true } },
});
```

### Create a databaseProvisionModule

```typescript
const { mutate } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseName: '<String>', ownerId: '<UUID>', subdomain: '<String>', domain: '<String>', modules: '<JSON>', options: '<JSON>', bootstrapUser: '<Boolean>', status: '<String>', errorMessage: '<String>', sourceDatabaseId: '<UUID>', bootstrapStatus: '<String>', bootstrapError: '<String>', databaseId: '<UUID>', completedAt: '<Datetime>', fulfilledAt: '<Datetime>' });
```
