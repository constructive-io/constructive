CREATE SCHEMA "scope_root";
CREATE SCHEMA "scope_dependency";
CREATE SCHEMA "scope_unrelated";
CREATE SCHEMA "scope_extension";
CREATE SCHEMA "scope_capability_root";

CREATE EXTENSION "pg_trgm" WITH SCHEMA "scope_extension";

CREATE TYPE "scope_dependency"."item_status" AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE DOMAIN "scope_dependency"."positive_integer" AS integer
  CHECK (VALUE > 0);

CREATE TYPE "scope_dependency"."item_payload" AS (
  status "scope_dependency"."item_status",
  score "scope_dependency"."positive_integer"
);

CREATE TYPE "scope_dependency"."integer_span" AS RANGE (
  subtype = integer,
  multirange_type_name = "scope_dependency"."integer_span_set"
);

CREATE TABLE "scope_root"."closure_items" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  status "scope_dependency"."item_status" NOT NULL,
  score "scope_dependency"."positive_integer" NOT NULL,
  payload "scope_dependency"."item_payload" NOT NULL,
  active_span "scope_dependency"."integer_span"
);

CREATE INDEX "closure_items_status_idx"
  ON "scope_root"."closure_items" (status);

CREATE INDEX "closure_items_score_idx"
  ON "scope_root"."closure_items" (score);

CREATE INDEX "closure_items_title_gin_trgm_idx"
  ON "scope_root"."closure_items"
  USING gin (title "scope_extension"."gin_trgm_ops");

CREATE INDEX "closure_items_title_gist_trgm_idx"
  ON "scope_root"."closure_items"
  USING gist (title "scope_extension"."gist_trgm_ops"(siglen = 32));

CREATE FUNCTION "scope_root"."echo_dependency_status"(
  input_status "scope_dependency"."item_status"
)
RETURNS "scope_dependency"."item_status"
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT input_status;
$$;

CREATE FUNCTION "scope_root"."make_dependency_payload"(
  input_status "scope_dependency"."item_status",
  input_score "scope_dependency"."positive_integer"
)
RETURNS "scope_dependency"."item_payload"
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT ROW(input_status, input_score)::"scope_dependency"."item_payload";
$$;

CREATE TYPE "scope_unrelated"."item_status" AS ENUM (
  'draft',
  'active',
  'archived'
);

CREATE DOMAIN "scope_unrelated"."positive_integer" AS integer
  CHECK (VALUE > 0);

CREATE TABLE "scope_unrelated"."closure_items" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  status "scope_unrelated"."item_status" NOT NULL,
  score "scope_unrelated"."positive_integer" NOT NULL
);

CREATE INDEX "unrelated_closure_items_status_idx"
  ON "scope_unrelated"."closure_items" (status);

CREATE FUNCTION "scope_unrelated"."echo_dependency_status"(
  input_status "scope_unrelated"."item_status"
)
RETURNS "scope_unrelated"."item_status"
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT input_status;
$$;

CREATE TABLE "scope_capability_root"."capability_items" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL
);
