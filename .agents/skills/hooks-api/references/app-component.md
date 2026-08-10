# appComponent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

App component rows binding an app to typed catalog rows (exactly one typed component reference per row)

## Usage

```typescript
useAppComponentsQuery({ selection: { fields: { appId: true, componentApiId: true, componentDomainId: true, componentInstallationId: true, componentSiteId: true, componentType: true, config: true, createdAt: true, databaseId: true, id: true, updatedAt: true } } })
useAppComponentQuery({ id: '<UUID>', selection: { fields: { appId: true, componentApiId: true, componentDomainId: true, componentInstallationId: true, componentSiteId: true, componentType: true, config: true, createdAt: true, databaseId: true, id: true, updatedAt: true } } })
useCreateAppComponentMutation({ selection: { fields: { id: true } } })
useUpdateAppComponentMutation({ selection: { fields: { id: true } } })
useDeleteAppComponentMutation({})
```

## Examples

### List all appComponents

```typescript
const { data, isLoading } = useAppComponentsQuery({
  selection: { fields: { appId: true, componentApiId: true, componentDomainId: true, componentInstallationId: true, componentSiteId: true, componentType: true, config: true, createdAt: true, databaseId: true, id: true, updatedAt: true } },
});
```

### Create a appComponent

```typescript
const { mutate } = useCreateAppComponentMutation({
  selection: { fields: { id: true } },
});
mutate({ appId: '<UUID>', componentApiId: '<UUID>', componentDomainId: '<UUID>', componentInstallationId: '<UUID>', componentSiteId: '<UUID>', componentType: '<String>', config: '<JSON>', databaseId: '<UUID>' });
```
