-- A query that stays on its connection long enough for a test to terminate the
-- backend serving it.
CREATE FUNCTION "simple-pets-public".connection_loss_probe(seconds double precision)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  PERFORM pg_sleep(seconds);
  RETURN 'done';
END
$$;

GRANT EXECUTE ON FUNCTION "simple-pets-public".connection_loss_probe(double precision) TO anonymous;
