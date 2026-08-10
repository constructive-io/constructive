# oauthRequestsModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Config row for the oauth_requests_module, which provisions the in-flight half of an SSO
     sign-in: the OAuth authorization requests table (state + PKCE code_verifier) and the
     pending identity links table (a verified identity parked under a single-use ticket),
     both private, plus the five SECURITY DEFINER procedures that are their only surface.
     Sibling of identity_providers_module (durable provider configuration) rather than part
     of it: this is ephemeral, purged flow state with its own retention.

## Usage

```typescript
useOauthRequestsModulesQuery({ selection: { fields: { databaseId: true, entityField: true, entityTableId: true, id: true, oauthAuthorizationRequestsTableId: true, oauthAuthorizationRequestsTableName: true, pendingIdentityLinksTableId: true, pendingIdentityLinksTableName: true, prefix: true, privateSchemaId: true, privateSchemaName: true, scope: true } } })
useOauthRequestsModuleQuery({ id: '<UUID>', selection: { fields: { databaseId: true, entityField: true, entityTableId: true, id: true, oauthAuthorizationRequestsTableId: true, oauthAuthorizationRequestsTableName: true, pendingIdentityLinksTableId: true, pendingIdentityLinksTableName: true, prefix: true, privateSchemaId: true, privateSchemaName: true, scope: true } } })
useCreateOauthRequestsModuleMutation({ selection: { fields: { id: true } } })
useUpdateOauthRequestsModuleMutation({ selection: { fields: { id: true } } })
useDeleteOauthRequestsModuleMutation({})
```

## Examples

### List all oauthRequestsModules

```typescript
const { data, isLoading } = useOauthRequestsModulesQuery({
  selection: { fields: { databaseId: true, entityField: true, entityTableId: true, id: true, oauthAuthorizationRequestsTableId: true, oauthAuthorizationRequestsTableName: true, pendingIdentityLinksTableId: true, pendingIdentityLinksTableName: true, prefix: true, privateSchemaId: true, privateSchemaName: true, scope: true } },
});
```

### Create a oauthRequestsModule

```typescript
const { mutate } = useCreateOauthRequestsModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', oauthAuthorizationRequestsTableId: '<UUID>', oauthAuthorizationRequestsTableName: '<String>', pendingIdentityLinksTableId: '<UUID>', pendingIdentityLinksTableName: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', scope: '<String>' });
```
