# identityProvidersModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the identity_providers_module, which provisions a per-database identity_providers config table holding OAuth2 / OIDC (and future SAML) provider definitions: protocol kind, endpoint URLs, encrypted client secret, scopes, audience validation, PKCE, and email-handling flags. Built-in providers (google, github, apple, ...) are seeded as is_built_in=true rows; custom providers use slugs of the form custom:<slug>.

## Usage

```typescript
useIdentityProvidersModulesQuery({ selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } } })
useIdentityProvidersModuleQuery({ id: '<UUID>', selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } } })
useCreateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useUpdateIdentityProvidersModuleMutation({ selection: { fields: { id: true } } })
useDeleteIdentityProvidersModuleMutation({})
```

## Examples

### List all identityProvidersModules

```typescript
const { data, isLoading } = useIdentityProvidersModulesQuery({
  selection: { fields: { id: true, databaseId: true, schemaId: true, privateSchemaId: true, tableId: true, tableName: true } },
});
```

### Create a identityProvidersModule

```typescript
const { mutate } = useCreateIdentityProvidersModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', schemaId: '<UUID>', privateSchemaId: '<UUID>', tableId: '<UUID>', tableName: '<String>' });
```
