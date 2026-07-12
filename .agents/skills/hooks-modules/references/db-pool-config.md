# dbPoolConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases.

## Usage

```typescript
useDbPoolConfigsQuery({ selection: { fields: { id: true, presetSlug: true, domain: true, poolOwnerId: true, min: true, max: true, warmTtl: true, enabled: true, createdAt: true, updatedAt: true } } })
useDbPoolConfigQuery({ id: '<UUID>', selection: { fields: { id: true, presetSlug: true, domain: true, poolOwnerId: true, min: true, max: true, warmTtl: true, enabled: true, createdAt: true, updatedAt: true } } })
useCreateDbPoolConfigMutation({ selection: { fields: { id: true } } })
useUpdateDbPoolConfigMutation({ selection: { fields: { id: true } } })
useDeleteDbPoolConfigMutation({})
```

## Examples

### List all dbPoolConfigs

```typescript
const { data, isLoading } = useDbPoolConfigsQuery({
  selection: { fields: { id: true, presetSlug: true, domain: true, poolOwnerId: true, min: true, max: true, warmTtl: true, enabled: true, createdAt: true, updatedAt: true } },
});
```

### Create a dbPoolConfig

```typescript
const { mutate } = useCreateDbPoolConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ presetSlug: '<String>', domain: '<String>', poolOwnerId: '<UUID>', min: '<Int>', max: '<Int>', warmTtl: '<Interval>', enabled: '<Boolean>' });
```
