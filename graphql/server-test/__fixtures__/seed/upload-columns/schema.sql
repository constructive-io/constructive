-- A table with the column types the managed storage lane projects into
-- (`image`, `upload`, `attachment`).

CREATE SCHEMA IF NOT EXISTS upload_columns;

GRANT USAGE ON SCHEMA upload_columns TO administrator, authenticated, anonymous;

-- The platform's types module declares these; a suite without it gets the bare shape.
DO $$ BEGIN
  IF to_regtype('public.image') IS NULL THEN CREATE DOMAIN public.image AS jsonb; END IF;
  IF to_regtype('public.upload') IS NULL THEN CREATE DOMAIN public.upload AS jsonb; END IF;
  IF to_regtype('public.attachment') IS NULL THEN CREATE DOMAIN public.attachment AS text; END IF;
END $$;

CREATE TABLE upload_columns.products (
  id serial PRIMARY KEY,
  title text NOT NULL,
  photo public.image,
  manual public.upload,
  brochure public.attachment
);

GRANT SELECT, INSERT, UPDATE, DELETE ON upload_columns.products TO administrator, authenticated, anonymous;
GRANT USAGE, SELECT ON SEQUENCE upload_columns.products_id_seq TO administrator, authenticated, anonymous;

INSERT INTO upload_columns.products (title) VALUES ('kettle');
