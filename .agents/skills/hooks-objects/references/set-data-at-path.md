# setDataAtPath

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query mutation hook for setDataAtPath

## Usage

```typescript
const { mutate } = useSetDataAtPathMutation(); mutate({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } });
```

## Examples

### Use useSetDataAtPathMutation

```typescript
const { mutate, isLoading } = useSetDataAtPathMutation();
mutate({ input: { dbId: '<UUID>', root: '<UUID>', path: '<String>', data: '<JSON>' } });
```
