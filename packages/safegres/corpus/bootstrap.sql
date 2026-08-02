-- Roles every corpus case is graded against.
--
-- Two, because the whole model turns on the difference: `corpus_anon` is the
-- role an unauthenticated request arrives as, `corpus_user` the role a
-- signed-in one does. A case that grants `corpus_user` a write is a working
-- application; the same grant to `corpus_anon` is a critical.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'corpus_anon') THEN
    CREATE ROLE corpus_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'corpus_user') THEN
    CREATE ROLE corpus_user NOLOGIN;
  END IF;
END $$;
