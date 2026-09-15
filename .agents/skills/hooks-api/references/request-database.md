# requestDatabase

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. Pass organization_id to have the organization own the database from the start (the caller must be an owner of that organization); the requesting user is still the identity bootstrapped into the new database. Omit it for a personal database. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb);
  SELECT * FROM metaschema_public.request_database('team_app', 'example.com', preset_slug := 'full', organization_id := '00000000-0000-0000-0000-000000000000'::uuid);

## Usage

```typescript
const { mutate } = useRequestDatabaseMutation(); mutate({ input: '<RequestDatabaseInput>' });
```

## Examples

### Use useRequestDatabaseMutation

```typescript
const { mutate, isLoading } = useRequestDatabaseMutation();
mutate({ input: '<RequestDatabaseInput>' });
```
