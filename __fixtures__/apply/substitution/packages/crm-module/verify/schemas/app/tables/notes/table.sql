-- Verify schemas/app/tables/notes/table on pg

BEGIN;

SELECT id, owner, body FROM app.notes WHERE FALSE;

ROLLBACK;
