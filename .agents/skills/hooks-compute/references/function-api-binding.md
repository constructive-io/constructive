# functionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
useFunctionApiBindingsQuery({ selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } } })
useFunctionApiBindingQuery({ id: '<UUID>', selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } } })
useCreateFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useUpdateFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useDeleteFunctionApiBindingMutation({})
```

## Examples

### List all functionApiBindings

```typescript
const { data, isLoading } = useFunctionApiBindingsQuery({
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});
```

### Create a functionApiBinding

```typescript
const { mutate } = useCreateFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' });
```
