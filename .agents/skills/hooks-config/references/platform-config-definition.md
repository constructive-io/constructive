# platformConfigDefinition

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Registry of valid config keys — declares which config entries the platform recognizes

## Usage

```typescript
usePlatformConfigDefinitionsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } } })
usePlatformConfigDefinitionQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } } })
useCreatePlatformConfigDefinitionMutation({ selection: { fields: { id: true } } })
useUpdatePlatformConfigDefinitionMutation({ selection: { fields: { id: true } } })
useDeletePlatformConfigDefinitionMutation({})
```

## Examples

### List all platformConfigDefinitions

```typescript
const { data, isLoading } = usePlatformConfigDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } },
});
```

### Create a platformConfigDefinition

```typescript
const { mutate } = useCreatePlatformConfigDefinitionMutation({
  selection: { fields: { id: true } },
});
mutate({ name: '<String>', description: '<String>', defaultValue: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>' });
```
