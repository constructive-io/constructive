-- Call-graph fixture: a public sign-in path that crosses into a private
-- schema through SECURITY DEFINER functions.
CREATE SCHEMA fx_cg_public;
CREATE SCHEMA fx_cg_private;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    CREATE ROLE anonymous;
  END IF;
END $$;

CREATE TABLE fx_cg_private.users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL
);
ALTER TABLE fx_cg_private.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE fx_cg_public.widgets (
  id uuid PRIMARY KEY,
  name text
);

-- Private helper: DEFINER, reads the private users table, unpinned search_path.
CREATE FUNCTION fx_cg_private.verify_password(user_email text, pw text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE ok boolean;
BEGIN
  SELECT (u.password_hash = pw) INTO ok
  FROM fx_cg_private.users u WHERE u.email = user_email;
  RETURN COALESCE(ok, false);
END;
$$;
REVOKE EXECUTE ON FUNCTION fx_cg_private.verify_password FROM PUBLIC;

-- Private helper: mutates the auth context.
CREATE FUNCTION fx_cg_private.issue_token(user_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = fx_cg_private AS $$
BEGIN
  PERFORM set_config('jwt.claims.user_email', user_email, true);
  RETURN 'token';
END;
$$;
REVOKE EXECUTE ON FUNCTION fx_cg_private.issue_token FROM PUBLIC;

-- Public entry point: DEFINER with pinned search_path, callable by anonymous.
CREATE FUNCTION fx_cg_public.sign_in(user_email text, pw text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = fx_cg_public AS $$
DECLARE tok text;
BEGIN
  IF NOT fx_cg_private.verify_password(user_email, pw) THEN
    RAISE EXCEPTION 'bad credentials';
  END IF;
  tok := fx_cg_private.issue_token(user_email);
  RETURN tok;
END;
$$;
REVOKE EXECUTE ON FUNCTION fx_cg_public.sign_in FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fx_cg_public.sign_in TO anonymous;

-- Public INVOKER function: not an entry point (no API grant), dynamic SQL.
CREATE FUNCTION fx_cg_public.run_report(tbl text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('SELECT count(*) FROM %I', tbl);
END;
$$;
REVOKE EXECUTE ON FUNCTION fx_cg_public.run_report FROM PUBLIC;

-- Public entry with dynamic SQL, callable by authenticated.
CREATE FUNCTION fx_cg_public.widget_report()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fx_cg_public.run_report('widgets');
END;
$$;
REVOKE EXECUTE ON FUNCTION fx_cg_public.widget_report FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fx_cg_public.widget_report TO authenticated;
