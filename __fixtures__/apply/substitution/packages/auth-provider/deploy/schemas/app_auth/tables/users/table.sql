-- Deploy schemas/app_auth/tables/users/table to pg

-- requires: schemas/app_auth/schema

BEGIN;

CREATE TABLE app_auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
