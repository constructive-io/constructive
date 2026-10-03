-- Error-masking fixture: a table the anonymous role holds no grant on, a
-- mutation refused with a registered public code, and a query that fails with
-- an unexpected database error.
--
-- Compose after app-schemas/simple-pets/schema.sql and scoped/test-data.sql.

CREATE TABLE "simple-pets-public".vault_items (
  id serial PRIMARY KEY,
  secret text NOT NULL
);
REVOKE ALL ON "simple-pets-public".vault_items FROM anonymous, authenticated, PUBLIC;

CREATE FUNCTION "simple-pets-public".invite_member(address text)
RETURNS boolean AS $$
BEGIN
  RAISE EXCEPTION 'INVITE_ADDRESS_REQUIRED';
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE FUNCTION "simple-pets-public".vault_ratio()
RETURNS integer AS $$
BEGIN
  RETURN 1 / 0;
END;
$$ LANGUAGE plpgsql STABLE;
