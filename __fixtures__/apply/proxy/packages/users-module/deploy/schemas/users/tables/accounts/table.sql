-- Deploy schemas/users/tables/accounts/table to pg

-- requires: schemas/users/schema

BEGIN;

CREATE TABLE users.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
