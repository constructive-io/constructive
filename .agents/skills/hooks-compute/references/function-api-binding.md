# functionApiBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Join table binding function definitions to API endpoints with per-binding alias and config

## Usage

```typescript
useFunctionApiBindingsQuery({ selection: { fields: { alias: true, apiId: true, config: true, createdAt: true, functionDefinitionId: true, id: true, updatedAt: true } } })
useFunctionApiBindingQuery({ id: '<UUID>', selection: { fields: { alias: true, apiId: true, config: true, createdAt: true, functionDefinitionId: true, id: true, updatedAt: true } } })
useCreateFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useUpdateFunctionApiBindingMutation({ selection: { fields: { id: true } } })
useDeleteFunctionApiBindingMutation({})
```

## Examples

### List all functionApiBindings

```typescript
const { data, isLoading } = useFunctionApiBindingsQuery({
  selection: { fields: { alias: true, apiId: true, config: true, createdAt: true, functionDefinitionId: true, id: true, updatedAt: true } },
});
```

### Create a functionApiBinding

```typescript
const { mutate } = useCreateFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
mutate({ alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' });
```
