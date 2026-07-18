# platformFunctionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
usePlatformFunctionApiBindingsQuery({ selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } } })
usePlatformFunctionApiBindingQuery({ id: '<UUID>', selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } } })
useCreatePlatformFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionApiBindingMutation({})
```

## Examples

### List all platformFunctionApiBindings

```typescript
const { data, isLoading } = usePlatformFunctionApiBindingsQuery({
  selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } },
});
```

### Create a platformFunctionApiBinding

```typescript
const { mutate } = useCreatePlatformFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' });
```
