# function

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for Function data operations

## Usage

```typescript
useFunctionsQuery({ selection: { fields: { apiExposed: true, arguments: true, bodyAst: true, category: true, data: true, databaseId: true, functionType: true, id: true, isStrict: true, kind: true, name: true, returns: true, schemaId: true, securityInvoker: true, smartTags: true, tags: true, volatility: true } } })
useFunctionQuery({ id: '<UUID>', selection: { fields: { apiExposed: true, arguments: true, bodyAst: true, category: true, data: true, databaseId: true, functionType: true, id: true, isStrict: true, kind: true, name: true, returns: true, schemaId: true, securityInvoker: true, smartTags: true, tags: true, volatility: true } } })
useCreateFunctionMutation({ selection: { fields: { id: true } } })
useUpdateFunctionMutation({ selection: { fields: { id: true } } })
useDeleteFunctionMutation({})
```

## Examples

### List all functions

```typescript
const { data, isLoading } = useFunctionsQuery({
  selection: { fields: { apiExposed: true, arguments: true, bodyAst: true, category: true, data: true, databaseId: true, functionType: true, id: true, isStrict: true, kind: true, name: true, returns: true, schemaId: true, securityInvoker: true, smartTags: true, tags: true, volatility: true } },
});
```

### Create a function

```typescript
const { mutate } = useCreateFunctionMutation({
  selection: { fields: { id: true } },
});
mutate({ apiExposed: '<Boolean>', arguments: '<JSON>', bodyAst: '<JSON>', category: '<ObjectCategory>', data: '<JSON>', databaseId: '<UUID>', functionType: '<String>', isStrict: '<Boolean>', kind: '<String>', name: '<String>', returns: '<JSON>', schemaId: '<UUID>', securityInvoker: '<Boolean>', smartTags: '<JSON>', tags: '<String>', volatility: '<String>' });
```
