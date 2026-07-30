-- Revert schemas/app/policies/notes_owner from pg

BEGIN;

DROP POLICY notes_owner ON app.notes;

COMMIT;
