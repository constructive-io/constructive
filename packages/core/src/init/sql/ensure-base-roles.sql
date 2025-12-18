-- Ensure base roles exist (anonymous, authenticated, administrator)
-- Parameters: $1 = anonymous role name, $2 = authenticated role name, $3 = administrator role name
-- Note: This is a single DO block to work with parameterized queries (pg library limitation)
DO $do$
DECLARE
  v_anonymous TEXT := COALESCE($1, 'anonymous');
  v_authenticated TEXT := COALESCE($2, 'authenticated');
  v_administrator TEXT := COALESCE($3, 'administrator');
BEGIN
  -- Create anonymous role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_anonymous);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Create authenticated role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_authenticated);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Create administrator role
  BEGIN
    EXECUTE format('CREATE ROLE %I', v_administrator);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
  
  -- Set role attributes (safe to run even if role already exists)
  -- Anonymous role attributes
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_anonymous);
  
  -- Authenticated role attributes
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION NOBYPASSRLS', v_authenticated);
  
  -- Administrator role attributes (CAN bypass RLS)
  EXECUTE format('ALTER ROLE %I WITH NOCREATEDB NOSUPERUSER NOCREATEROLE NOLOGIN NOREPLICATION BYPASSRLS', v_administrator);
END
$do$;
