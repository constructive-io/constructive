-- R3 seed: an RLS-enabled table with a grant TO PUBLIC. This must surface even
-- though `audit` always resolves a concrete (named) role set for introspection
-- — PUBLIC is not a named role, so a naive role filter would drop it and R3
-- could never fire (regression guard for the introspection role filter).

CREATE SCHEMA IF NOT EXISTS fx_r3;

CREATE TABLE fx_r3.docs (
  id bigserial PRIMARY KEY,
  body text
);

ALTER TABLE fx_r3.docs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON fx_r3.docs TO PUBLIC;
