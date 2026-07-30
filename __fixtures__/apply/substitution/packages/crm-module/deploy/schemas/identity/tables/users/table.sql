-- Deploy schemas/identity/tables/users/table to pg

-- requires: schemas/identity/schema

BEGIN;

CREATE TABLE identity.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_token text,
  recovery_token text
);

COMMIT;
