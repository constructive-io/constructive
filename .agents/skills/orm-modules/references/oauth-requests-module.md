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
db.oauthRequestsModule.findMany({ select: { id: true } }).execute()
db.oauthRequestsModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.oauthRequestsModule.create({ data: { databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', oauthAuthorizationRequestsTableId: '<UUID>', oauthAuthorizationRequestsTableName: '<String>', pendingIdentityLinksTableId: '<UUID>', pendingIdentityLinksTableName: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', scope: '<String>' }, select: { id: true } }).execute()
db.oauthRequestsModule.update({ where: { id: '<UUID>' }, data: { databaseId: '<UUID>' }, select: { id: true } }).execute()
db.oauthRequestsModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all oauthRequestsModule records

```typescript
const items = await db.oauthRequestsModule.findMany({
  select: { id: true, databaseId: true }
}).execute();
```

### Create a oauthRequestsModule

```typescript
const item = await db.oauthRequestsModule.create({
  data: { databaseId: '<UUID>', entityField: '<String>', entityTableId: '<UUID>', oauthAuthorizationRequestsTableId: '<UUID>', oauthAuthorizationRequestsTableName: '<String>', pendingIdentityLinksTableId: '<UUID>', pendingIdentityLinksTableName: '<String>', prefix: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', scope: '<String>' },
  select: { id: true }
}).execute();
```
