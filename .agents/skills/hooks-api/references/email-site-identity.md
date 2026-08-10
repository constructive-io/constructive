# emailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a site to the identity it sends as. Unique on site_id: one identity per site, but many sites may share an identity.

## Usage

```typescript
useEmailSiteIdentitiesQuery({ selection: { fields: { createdAt: true, databaseId: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } } })
useEmailSiteIdentityQuery({ id: '<UUID>', selection: { fields: { createdAt: true, databaseId: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } } })
useCreateEmailSiteIdentityMutation({ selection: { fields: { id: true } } })
useUpdateEmailSiteIdentityMutation({ selection: { fields: { id: true } } })
useDeleteEmailSiteIdentityMutation({})
```

## Examples

### List all emailSiteIdentities

```typescript
const { data, isLoading } = useEmailSiteIdentitiesQuery({
  selection: { fields: { createdAt: true, databaseId: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } },
});
```

### Create a emailSiteIdentity

```typescript
const { mutate } = useCreateEmailSiteIdentityMutation({
  selection: { fields: { id: true } },
});
mutate({ databaseId: '<UUID>', emailIdentityId: '<UUID>', siteId: '<UUID>' });
```
