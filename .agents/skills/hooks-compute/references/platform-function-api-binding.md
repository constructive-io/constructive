# platformFunctionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
usePlatformFunctionApiBindingsQuery({ selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } } })
usePlatformFunctionApiBindingQuery({ id: '<UUID>', selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } } })
useCreatePlatformFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionApiBindingMutation({})
```

## Examples

### List all platformFunctionApiBindings

```typescript
const { data, isLoading } = usePlatformFunctionApiBindingsQuery({
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});
```

### Create a platformFunctionApiBinding

```typescript
const { mutate } = useCreatePlatformFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' });
```
