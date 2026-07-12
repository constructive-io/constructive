# integrationProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth.

## Usage

```typescript
useIntegrationProvidersQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } } })
useIntegrationProviderQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } } })
useCreateIntegrationProviderMutation({ selection: { fields: { id: true } } })
useUpdateIntegrationProviderMutation({ selection: { fields: { id: true } } })
useDeleteIntegrationProviderMutation({})
```

## Examples

### List all integrationProviders

```typescript
const { data, isLoading } = useIntegrationProvidersQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } },
});
```

### Create a integrationProvider

```typescript
const { mutate } = useCreateIntegrationProviderMutation({
  selection: { fields: { id: true } },
});
mutate({ slug: '<String>', name: '<String>', description: '<String>', category: '<String>', icon: '<String>', logo: '<Image>', brand: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>' });
```
