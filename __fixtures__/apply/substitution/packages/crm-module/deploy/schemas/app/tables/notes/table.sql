-- Deploy schemas/app/tables/notes/table to pg

-- requires: schemas/app/schema
-- requires: schemas/identity/tables/users/table

BEGIN;

CREATE TABLE app.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid NOT NULL,
  body text NOT NULL
);

ALTER TABLE app.notes
  ADD CONSTRAINT notes_owner_fkey
  FOREIGN KEY (owner) REFERENCES identity.users (id);

COMMIT;
