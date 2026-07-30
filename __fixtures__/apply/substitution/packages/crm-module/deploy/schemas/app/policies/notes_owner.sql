-- Deploy schemas/app/policies/notes_owner to pg

-- requires: schemas/app/tables/notes/table
-- requires: schemas/identity/procedures/current_actor

BEGIN;

ALTER TABLE app.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_owner ON app.notes
  USING (owner = identity.current_actor());

COMMIT;
