# dbPoolConfig

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Per-preset configuration for the warm database pool: sizing, TTL, and the platform service org that owns unclaimed warm databases.

## Usage

```typescript
useDbPoolConfigsQuery({ selection: { fields: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } } })
useDbPoolConfigQuery({ id: '<UUID>', selection: { fields: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } } })
useCreateDbPoolConfigMutation({ selection: { fields: { id: true } } })
useUpdateDbPoolConfigMutation({ selection: { fields: { id: true } } })
useDeleteDbPoolConfigMutation({})
```

## Examples

### List all dbPoolConfigs

```typescript
const { data, isLoading } = useDbPoolConfigsQuery({
  selection: { fields: { createdAt: true, domain: true, enabled: true, id: true, max: true, min: true, poolOwnerId: true, presetSlug: true, updatedAt: true, warmTtl: true } },
});
```

### Create a dbPoolConfig

```typescript
const { mutate } = useCreateDbPoolConfigMutation({
  selection: { fields: { id: true } },
});
mutate({ domain: '<String>', enabled: '<Boolean>', max: '<Int>', min: '<Int>', poolOwnerId: '<UUID>', presetSlug: '<String>', warmTtl: '<Interval>' });
```
