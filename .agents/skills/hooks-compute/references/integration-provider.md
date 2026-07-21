# integrationProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth.

## Usage

```typescript
useIntegrationProvidersQuery({ selection: { fields: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } } })
useIntegrationProviderQuery({ id: '<UUID>', selection: { fields: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } } })
useCreateIntegrationProviderMutation({ selection: { fields: { id: true } } })
useUpdateIntegrationProviderMutation({ selection: { fields: { id: true } } })
useDeleteIntegrationProviderMutation({})
```

## Examples

### List all integrationProviders

```typescript
const { data, isLoading } = useIntegrationProvidersQuery({
  selection: { fields: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } },
});
```

### Create a integrationProvider

```typescript
const { mutate } = useCreateIntegrationProviderMutation({
  selection: { fields: { id: true } },
});
mutate({ brand: '<JSON>', category: '<String>', description: '<String>', icon: '<String>', logo: '<Image>', name: '<String>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>' });
```
