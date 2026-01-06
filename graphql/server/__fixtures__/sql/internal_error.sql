BEGIN;

CREATE SCHEMA IF NOT EXISTS app_public;

-- Function to trigger internal error for error handling tests
CREATE OR REPLACE FUNCTION app_public.trigger_internal_error()
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RAISE EXCEPTION 'Internal test error' USING ERRCODE = 'XX000';
END;
$$;

GRANT USAGE ON SCHEMA app_public TO anonymous;
GRANT USAGE ON SCHEMA app_public TO authenticated;
GRANT USAGE ON SCHEMA app_public TO administrator;
GRANT EXECUTE ON FUNCTION app_public.trigger_internal_error() TO anonymous;
GRANT EXECUTE ON FUNCTION app_public.trigger_internal_error() TO authenticated;
GRANT EXECUTE ON FUNCTION app_public.trigger_internal_error() TO administrator;

COMMIT;
