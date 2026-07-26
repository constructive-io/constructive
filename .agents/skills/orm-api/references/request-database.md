# requestDatabase

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Requests a database and returns a ticket (database_provision_module row) to poll.

Pass exactly one of preset_slug or modules. The pool, presets, and owner bootstrap are private implementation details: a warm pool hit fulfills the ticket immediately (fulfilled_at set, deferred owner bootstrap), otherwise the database is cold-provisioned asynchronously with exactly the requested modules. Poll the ticket until status = 'completed'; it then carries database_id and fulfilled_at.

Example usage:
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', preset_slug := 'full');
  SELECT * FROM metaschema_public.request_database('my_app', 'example.com', modules := '["users_module", "emails_module"]'::jsonb);

## Usage

```typescript
db.mutation.requestDatabase({ input: '<RequestDatabaseInput>' }).execute()
```

## Examples

### Run requestDatabase

```typescript
const result = await db.mutation.requestDatabase({ input: '<RequestDatabaseInput>' }).execute();
```
