# pgpm Table Creation Rules

When creating a new table in `metaschema_modules_public`, `metaschema_public`, or `constructive_routing_public` schemas in the constructive-db repository, follow these steps.

## Required: Deterministic ID Trigger

Every table with a `uuid` primary key MUST have a `zzz_set_deterministic_id` trigger. This is critical for deterministic test runs and reproducible deployments.

### Pattern

For a table named `my_table` in schema `metaschema_modules_public`:

1. **Deploy file** at `packages/metaschema/deploy/schemas/metaschema_modules_public/tables/my_table/triggers/set_deterministic_id.sql`:

```sql
-- Deploy schemas/metaschema_modules_public/tables/my_table/triggers/set_deterministic_id to pg

-- requires: schemas/metaschema_modules_private/schema
-- requires: schemas/metaschema_modules_public/tables/my_table/table
-- requires: schemas/metaschema_private/procedures/deterministic_id

BEGIN;

CREATE FUNCTION metaschema_modules_private.tg_set_my_table_deterministic_id()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('metaschema.deterministic_ids', true) = 'true' THEN
    NEW.id := metaschema_private.deterministic_id(NEW.table_id, NEW.node_type);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zzz_set_deterministic_id
BEFORE INSERT ON metaschema_modules_public.my_table
FOR EACH ROW
EXECUTE FUNCTION metaschema_modules_private.tg_set_my_table_deterministic_id();

ALTER TABLE metaschema_modules_public.my_table
ENABLE ALWAYS TRIGGER zzz_set_deterministic_id;

COMMIT;
```

Note: The `deterministic_id()` arguments vary by table. Check existing tables for the correct arguments.

2. **Verify file** — use `verify_function` and `verify_trigger`
3. **Revert file** — `DROP TRIGGER IF EXISTS` + `DROP FUNCTION IF EXISTS`
4. **pgpm.plan entry** — add with proper dependencies

## Checklist for New Tables

- [ ] Table DDL (deploy/verify/revert + pgpm.plan + extension SQL)
- [ ] Insert trigger (deploy/verify/revert + pgpm.plan)
- [ ] **Deterministic ID trigger** (deploy/verify/revert + pgpm.plan + extension SQL)
- [ ] COMMENT ON COLUMN for every column
- [ ] COMMENT ON TABLE
- [ ] Foreign key constraints with `@omit manyToMany` comments
- [ ] Indexes on foreign key columns
