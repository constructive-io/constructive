# databaseProvisionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Tracks database provisioning requests and their status. The BEFORE INSERT trigger creates the database and sets database_id before RLS policies are evaluated.

## Usage

```typescript
useDatabaseProvisionModulesQuery({ selection: { fields: { bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } } })
useDatabaseProvisionModuleQuery({ id: '<UUID>', selection: { fields: { bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } } })
useCreateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useUpdateDatabaseProvisionModuleMutation({ selection: { fields: { id: true } } })
useDeleteDatabaseProvisionModuleMutation({})
```

## Examples

### List all databaseProvisionModules

```typescript
const { data, isLoading } = useDatabaseProvisionModulesQuery({
  selection: { fields: { bootstrapError: true, bootstrapStatus: true, bootstrapUser: true, completedAt: true, createdAt: true, databaseId: true, databaseName: true, domain: true, errorMessage: true, fulfilledAt: true, id: true, modules: true, options: true, ownerId: true, sourceDatabaseId: true, status: true, subdomain: true, updatedAt: true } },
});
```

### Create a databaseProvisionModule

```typescript
const { mutate } = useCreateDatabaseProvisionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ bootstrapError: '<String>', bootstrapStatus: '<String>', bootstrapUser: '<Boolean>', completedAt: '<Datetime>', databaseId: '<UUID>', databaseName: '<String>', domain: '<String>', errorMessage: '<String>', fulfilledAt: '<Datetime>', modules: '<JSON>', options: '<JSON>', ownerId: '<UUID>', sourceDatabaseId: '<UUID>', status: '<String>', subdomain: '<String>' });
```
