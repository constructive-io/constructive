# platformEmailSiteIdentity

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Binds a site to the identity it sends as. Unique on site_id: one identity per site, but many sites may share an identity.

## Usage

```typescript
usePlatformEmailSiteIdentitiesQuery({ selection: { fields: { createdAt: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } } })
usePlatformEmailSiteIdentityQuery({ id: '<UUID>', selection: { fields: { createdAt: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } } })
useCreatePlatformEmailSiteIdentityMutation({ selection: { fields: { id: true } } })
useUpdatePlatformEmailSiteIdentityMutation({ selection: { fields: { id: true } } })
useDeletePlatformEmailSiteIdentityMutation({})
```

## Examples

### List all platformEmailSiteIdentities

```typescript
const { data, isLoading } = usePlatformEmailSiteIdentitiesQuery({
  selection: { fields: { createdAt: true, emailIdentityId: true, id: true, siteId: true, updatedAt: true } },
});
```

### Create a platformEmailSiteIdentity

```typescript
const { mutate } = useCreatePlatformEmailSiteIdentityMutation({
  selection: { fields: { id: true } },
});
mutate({ emailIdentityId: '<UUID>', siteId: '<UUID>' });
```
