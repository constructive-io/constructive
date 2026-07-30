-- Verify schemas/app/policies/notes_owner on pg

BEGIN;

SELECT owner FROM app.notes WHERE FALSE;

ROLLBACK;
