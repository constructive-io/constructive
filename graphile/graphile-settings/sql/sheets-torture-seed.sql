-- Sheets torture seed: one API schema with every column, key, relation and
-- upload shape a tenant database can have, so a generic grid can be checked
-- against what the Constructive preset really serves.
--
-- Requires the postgres-plus:18 image (postgis, vector, ltree, citext).
--
-- The Constructive type domains live in `public` with the names and smart
-- tags the types module gives them, so their GraphQL scalar names match a
-- real tenant database.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Constructive type domains (pgpm-modules/types, public schema)
-- ============================================================================
CREATE DOMAIN public.email AS citext CHECK (value ~ '@');
COMMENT ON DOMAIN public.email IS E'@name constructiveInternalTypeEmail';

CREATE DOMAIN public.url AS text CHECK (value ~ '^https?://[^\s]+$');
COMMENT ON DOMAIN public.url IS E'@name constructiveInternalTypeUrl';

CREATE DOMAIN public.hostname AS text CHECK (value ~ '^[^\s]+$');
COMMENT ON DOMAIN public.hostname IS E'@name constructiveInternalTypeHostname';

CREATE DOMAIN public.origin AS text CHECK (value ~ '^(https?://[^/\s]+|constructive://app)$');
COMMENT ON DOMAIN public.origin IS E'@name constructiveInternalTypeOrigin';

CREATE DOMAIN public.attachment AS text CHECK (value ~ '^https?://[^\s]+$');
COMMENT ON DOMAIN public.attachment IS E'@name constructiveInternalTypeAttachment';

CREATE DOMAIN public.image AS jsonb CHECK (
  jsonb_typeof(value) = 'object'
  AND (value ? 'url' OR value ? 'id' OR value ? 'key')
  AND (NOT value ? 'url' OR (value->>'url') ~ '^https?://[^\s]+$')
  AND (NOT value ? 'id' OR jsonb_typeof(value->'id') = 'string')
  AND (NOT value ? 'key' OR jsonb_typeof(value->'key') = 'string')
  AND (NOT value ? 'bucket' OR jsonb_typeof(value->'bucket') = 'string')
  AND (NOT value ? 'bucket_id' OR (value->>'bucket_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  AND (NOT value ? 'provider' OR jsonb_typeof(value->'provider') = 'string')
  AND (NOT value ? 'mime' OR jsonb_typeof(value->'mime') = 'string')
  AND (NOT value ? 'size' OR jsonb_typeof(value->'size') = 'number')
  AND (NOT value ? 'filename' OR jsonb_typeof(value->'filename') = 'string')
  AND (NOT value ? 'versions' OR jsonb_typeof(value->'versions') = 'array')
);
COMMENT ON DOMAIN public.image IS E'@name constructiveInternalTypeImage';

CREATE DOMAIN public.upload AS jsonb CHECK (
  jsonb_typeof(value) = 'object'
  AND (value ? 'url' OR value ? 'id' OR value ? 'key')
  AND (NOT value ? 'url' OR (value->>'url') ~ '^https?://[^\s]+$')
  AND (NOT value ? 'id' OR jsonb_typeof(value->'id') = 'string')
  AND (NOT value ? 'key' OR jsonb_typeof(value->'key') = 'string')
  AND (NOT value ? 'bucket' OR jsonb_typeof(value->'bucket') = 'string')
  AND (NOT value ? 'bucket_id' OR (value->>'bucket_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  AND (NOT value ? 'provider' OR jsonb_typeof(value->'provider') = 'string')
  AND (NOT value ? 'mime' OR jsonb_typeof(value->'mime') = 'string')
  AND (NOT value ? 'size' OR jsonb_typeof(value->'size') = 'number')
  AND (NOT value ? 'filename' OR jsonb_typeof(value->'filename') = 'string')
);
COMMENT ON DOMAIN public.upload IS E'@name constructiveInternalTypeUpload';

CREATE SCHEMA sheets_torture;

-- ============================================================================
-- Types owned by the API schema
-- ============================================================================
-- Labels with an underscore, a leading digit, mixed case, a space and a dash.
-- 'on hold' and 'needs-review' get the GraphQL names ON_HOLD and NEEDS_REVIEW.
CREATE TYPE sheets_torture.task_status AS ENUM (
  'todo',
  'in_progress',
  'done_ish',
  '1st_review',
  'Blocked',
  'done',
  'on hold',
  'needs-review'
);

CREATE TYPE sheets_torture.postal_address AS (
  street text,
  city text,
  postal_code varchar(10),
  country char(2)
);

-- ============================================================================
-- Scalars: one column per scalar type
-- ============================================================================
CREATE TABLE sheets_torture.scalar_kinds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  text_value text,
  citext_value citext,
  varchar_value varchar(40),
  char_value char(3),
  bool_nullable boolean,
  bool_required boolean NOT NULL DEFAULT false,
  smallint_value smallint,
  integer_value integer,
  bigint_value bigint,
  numeric_bounded numeric(12, 4),
  numeric_unbounded numeric,
  real_value real,
  double_value double precision,
  money_value money,
  uuid_value uuid,
  date_value date,
  time_value time,
  timetz_value timetz,
  timestamp_value timestamp,
  timestamptz_value timestamptz,
  interval_value interval,
  json_value json,
  jsonb_value jsonb,
  bytea_value bytea,
  inet_value inet,
  cidr_value cidr,
  macaddr_value macaddr,
  bit_value bit(8),
  varbit_value varbit(16),
  tsvector_value tsvector,
  ltree_value ltree
);
COMMENT ON TABLE sheets_torture.scalar_kinds IS 'One column of every plain value type';
COMMENT ON COLUMN sheets_torture.scalar_kinds.label IS 'Short name shown in lists';

-- ============================================================================
-- Arrays
-- ============================================================================
CREATE TABLE sheets_torture.array_kinds (
  id serial PRIMARY KEY,
  text_list text[],
  int_list integer[],
  uuid_list uuid[],
  date_list date[],
  numeric_list numeric(10, 2)[],
  short_code_list varchar(5)[],
  status_list sheets_torture.task_status[],
  path_list ltree[]
);

-- ============================================================================
-- Structured values: composite, ranges, geometry, vectors
-- ============================================================================
CREATE TABLE sheets_torture.structured_kinds (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  address sheets_torture.postal_address,
  int_range int4range,
  timestamp_range tstzrange,
  date_range daterange,
  native_point point,
  any_shape geometry,
  pin geometry(Point, 4326),
  outline geometry(Polygon),
  geo_pin geography(Point, 4326),
  any_geo geography,
  embedding vector(3),
  any_embedding vector
);

-- ============================================================================
-- Constructive domains, including the file columns
-- ============================================================================
CREATE TABLE sheets_torture.domain_kinds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email email,
  homepage url,
  host hostname,
  allowed_origin origin,
  avatar image,
  document upload,
  gallery upload[],
  attachment_link attachment
);

-- ============================================================================
-- Generated values and write restrictions
-- ============================================================================
CREATE TABLE sheets_torture.generated_values (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  serial_no integer GENERATED BY DEFAULT AS IDENTITY,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_note text,
  frozen_code text,
  secret_note text
);
COMMENT ON COLUMN sheets_torture.generated_values.locked_note IS E'@behavior -insert\nSet after the row exists';
COMMENT ON COLUMN sheets_torture.generated_values.frozen_code IS E'@behavior -update\nFixed once the row exists';
COMMENT ON COLUMN sheets_torture.generated_values.secret_note IS E'@behavior -select';

-- ============================================================================
-- Key shapes
-- ============================================================================
-- Single key not named id, with no default.
CREATE TABLE sheets_torture.countries (
  iso_code char(2) PRIMARY KEY,
  name text NOT NULL
);

-- Composite key.
CREATE TABLE sheets_torture.warehouse_items (
  warehouse_code text NOT NULL,
  sku text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  PRIMARY KEY (warehouse_code, sku)
);

-- No primary key.
CREATE TABLE sheets_torture.audit_events (
  happened_at timestamptz NOT NULL DEFAULT now(),
  actor text,
  message text NOT NULL
);

-- ============================================================================
-- Relation shapes
-- ============================================================================
-- Self reference, and a unique key that is not the primary key.
CREATE TABLE sheets_torture.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  manager_id uuid REFERENCES sheets_torture.people (id)
);

-- hasOne: the foreign key is the primary key.
CREATE TABLE sheets_torture.person_profiles (
  person_id uuid PRIMARY KEY REFERENCES sheets_torture.people (id),
  bio text,
  photo image
);

-- Two foreign keys to the same table: a required owner and an optional
-- reviewer.
CREATE TABLE sheets_torture.projects (
  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES sheets_torture.people (id),
  reviewer_id uuid REFERENCES sheets_torture.people (id),
  country_code char(2) REFERENCES sheets_torture.countries (iso_code)
);
COMMENT ON TABLE sheets_torture.projects IS 'Groups of tasks with an owner and a reviewer';

-- A foreign key to a unique non-key column, a composite foreign key, an enum,
-- a text column with a fixed list of values.
CREATE TABLE sheets_torture.tasks (
  id bigserial PRIMARY KEY,
  project_id integer NOT NULL REFERENCES sheets_torture.projects (id),
  title text NOT NULL,
  status sheets_torture.task_status NOT NULL DEFAULT 'todo',
  review_status sheets_torture.task_status,
  priority text CHECK (priority IN ('low', 'medium', 'high')),
  assignee_email citext REFERENCES sheets_torture.people (email),
  warehouse_code text,
  sku text,
  due_on date,
  FOREIGN KEY (warehouse_code, sku) REFERENCES sheets_torture.warehouse_items (warehouse_code, sku)
);
COMMENT ON COLUMN sheets_torture.tasks.title IS 'What needs to be done';

CREATE TABLE sheets_torture.labels (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text
);

-- A pure junction: its key is its two foreign keys.
CREATE TABLE sheets_torture.task_labels (
  task_id bigint NOT NULL REFERENCES sheets_torture.tasks (id),
  label_id integer NOT NULL REFERENCES sheets_torture.labels (id),
  PRIMARY KEY (task_id, label_id)
);
COMMENT ON TABLE sheets_torture.task_labels IS E'@behavior +manyToMany';

-- A junction with extra required columns.
CREATE TABLE sheets_torture.project_members (
  project_id integer NOT NULL REFERENCES sheets_torture.projects (id),
  person_id uuid NOT NULL REFERENCES sheets_torture.people (id),
  role text NOT NULL,
  joined_on date NOT NULL,
  PRIMARY KEY (project_id, person_id)
);
COMMENT ON TABLE sheets_torture.project_members IS E'@behavior +manyToMany';

-- The API serves a backward relation (hasOne, hasMany) only when the foreign
-- key columns are indexed. tasks.assignee_email is left without an index on
-- purpose, so people has no backward relation to tasks.
CREATE INDEX people_manager_id_idx ON sheets_torture.people (manager_id);
CREATE INDEX projects_owner_id_idx ON sheets_torture.projects (owner_id);
CREATE INDEX projects_reviewer_id_idx ON sheets_torture.projects (reviewer_id);
CREATE INDEX projects_country_code_idx ON sheets_torture.projects (country_code);
CREATE INDEX tasks_project_id_idx ON sheets_torture.tasks (project_id);
CREATE INDEX tasks_warehouse_item_idx ON sheets_torture.tasks (warehouse_code, sku);
CREATE INDEX task_labels_label_id_idx ON sheets_torture.task_labels (label_id);
CREATE INDEX project_members_person_id_idx ON sheets_torture.project_members (person_id);

-- A view.
CREATE VIEW sheets_torture.open_tasks AS
  SELECT id, project_id, title, status, due_on
  FROM sheets_torture.tasks
  WHERE status <> 'done';
COMMENT ON VIEW sheets_torture.open_tasks IS 'Tasks that are not done yet';

-- ============================================================================
-- Storage: a buckets table and its files table, tagged like the storage module
-- ============================================================================
CREATE TABLE sheets_torture.app_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'private',
  is_public boolean NOT NULL DEFAULT false,
  allowed_mime_types text[],
  max_file_size bigint,
  allow_custom_keys boolean NOT NULL DEFAULT false,
  allowed_origins text[],
  physical_name text,
  provision_requested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE sheets_torture.app_buckets IS E'@storageBuckets\nStorage buckets table';

CREATE TABLE sheets_torture.app_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES sheets_torture.app_buckets (id),
  key text NOT NULL,
  content_hash text NOT NULL,
  mime_type text NOT NULL,
  size bigint,
  filename text,
  owner_id uuid,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'requested',
  previous_version_id uuid REFERENCES sheets_torture.app_files (id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, key)
);
COMMENT ON TABLE sheets_torture.app_files IS E'@storageFiles\nStorage files table';

-- ============================================================================
-- Values a grid must not break on: non-finite numbers and infinite dates
-- ============================================================================
CREATE TABLE sheets_torture.special_values (
  id serial PRIMARY KEY,
  label text NOT NULL,
  real_value real,
  double_value double precision,
  numeric_value numeric,
  timestamptz_value timestamptz,
  date_value date
);

-- ============================================================================
-- Access for the test role
-- ============================================================================
GRANT USAGE ON SCHEMA sheets_torture TO authenticated, anonymous;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA sheets_torture TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA sheets_torture TO authenticated;

-- ============================================================================
-- Rows
-- ============================================================================
INSERT INTO sheets_torture.scalar_kinds (
  id, label, text_value, citext_value, varchar_value, char_value,
  bool_nullable, bool_required, smallint_value, integer_value, bigint_value,
  numeric_bounded, numeric_unbounded, real_value, double_value, money_value,
  uuid_value, date_value, time_value, timetz_value, timestamp_value,
  timestamptz_value, interval_value, json_value, jsonb_value, bytea_value,
  inet_value, cidr_value, macaddr_value, bit_value, varbit_value,
  tsvector_value, ltree_value
) VALUES
  (
    '00000000-0000-4000-8000-000000000001', 'typical',
    'Hello, world', 'MiXeD Case', 'forty chars at most', 'ab',
    true, true, 12, 42, 9007199254740993,
    12345678.1234, 123456789012345678901234567890.123456789012345678901234567890,
    3.25, 2.718281828459045, 1234.56,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2024-02-29', '13:45:30.123456', '13:45:30+07', '2024-02-29 13:45:30.123456',
    '2024-02-29 13:45:30.123456+00', '1 year 2 mons 3 days 04:05:06.789', '{"a": [1, 2, {"b": null}]}', '{"nested": {"deep": [true, false]}}', '\xdeadbeef',
    '192.168.0.1/24', '10.0.0.0/8', '08:00:2b:01:02:03', B'10101010', B'1101',
    to_tsvector('english', 'The quick brown fox jumps'), 'top.science.astronomy'
  ),
  (
    '00000000-0000-4000-8000-000000000002', 'extremes',
    '', 'ß ü ✓ 漢字', repeat('x', 40), 'xyz',
    false, false, 32767, -2147483648, 9223372036854775807,
    -99999999.9999, 0.000000000000000000000000000001,
    -3.4e38, 1.7976931348623157e308, -92233720368547758.08,
    'ffffffff-ffff-4fff-bfff-ffffffffffff', '0001-01-01', '00:00:00', '23:59:59.999999-12', '1970-01-01 00:00:00',
    '9999-12-31 23:59:59.999999+00', '-178000000 years', '[]', '"just a string"', '\x',
    '::1', '2001:db8::/32', 'ff:ff:ff:ff:ff:ff', B'00000000', B'',
    ''::tsvector, 'a'
  ),
  (
    '00000000-0000-4000-8000-000000000003', 'nulls',
    NULL, NULL, NULL, NULL,
    NULL, false, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL
  );

INSERT INTO sheets_torture.array_kinds (
  text_list, int_list, uuid_list, date_list, numeric_list, short_code_list, status_list, path_list
) VALUES
  (
    ARRAY['one', 'two, with comma', 'three "quoted"'], ARRAY[1, 2, 3],
    ARRAY['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11']::uuid[], ARRAY['2024-01-01', '2024-12-31']::date[],
    ARRAY[1.50, 99999999.99]::numeric(10, 2)[], ARRAY['ab', 'abcde']::varchar(5)[],
    ARRAY['todo', 'in_progress', '1st_review', 'needs-review']::sheets_torture.task_status[],
    ARRAY['top.science', 'a']::ltree[]
  ),
  ('{}', '{}', '{}', '{}', '{}', '{}', '{}', '{}'),
  (ARRAY[NULL, 'after null'], ARRAY[NULL, 7]::integer[], NULL, NULL, NULL, NULL, NULL, NULL),
  (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO sheets_torture.structured_kinds (
  address, int_range, timestamp_range, date_range, native_point,
  any_shape, pin, outline, geo_pin, any_geo, embedding, any_embedding
) VALUES
  (
    ROW('1 Main St', 'Springfield', '12345', 'US')::sheets_torture.postal_address,
    '[1,10)', '[2024-01-01 00:00+00,2024-02-01 00:00+00)', '[2024-01-01,2024-01-31]', '(1.5,-2.25)',
    ST_GeomFromText('LINESTRING(0 0, 1 1, 2 1)'), ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
    ST_GeomFromText('POLYGON((0 0, 0 1, 1 1, 1 0, 0 0))'), ST_GeogFromText('SRID=4326;POINT(2.3522 48.8566)'),
    ST_GeogFromText('SRID=4326;LINESTRING(0 0, 1 1)'), '[0.1, 0.2, 0.3]', '[1, 2, 3, 4, 5]'
  ),
  (
    ROW(NULL, 'Nowhere', NULL, NULL)::sheets_torture.postal_address,
    '(,5]', '[2024-01-01 00:00+00,)', 'empty', '(0,0)',
    ST_GeomFromText('GEOMETRYCOLLECTION(POINT(1 1), LINESTRING(0 0, 1 1))'), ST_SetSRID(ST_MakePoint(0, 0), 4326),
    NULL, NULL, NULL, '[0, 0, 0]', NULL
  ),
  (NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO sheets_torture.domain_kinds (
  id, contact_email, homepage, host, allowed_origin, avatar, document, gallery, attachment_link
) VALUES
  (
    '00000000-0000-4000-8000-0000000000d1', 'Someone@Example.com', 'https://example.com/a?b=c', 'api.example.com',
    'https://app.example.com',
    '{"id": "00000000-0000-4000-8000-0000000000f1", "key": "avatars/a.png", "bucket_id": "00000000-0000-4000-8000-0000000000b1", "mime": "image/png", "size": 2048, "filename": "a.png"}',
    '{"url": "https://cdn.example.com/doc.pdf", "mime": "application/pdf"}',
    ARRAY[
      '{"id": "00000000-0000-4000-8000-0000000000f2", "key": "gallery/1.jpg"}',
      '{"id": "00000000-0000-4000-8000-0000000000f3", "key": "gallery/2.jpg"}'
    ]::upload[],
    'https://example.com/files/report.pdf'
  ),
  ('00000000-0000-4000-8000-0000000000d2', NULL, NULL, NULL, 'constructive://app', NULL, NULL, '{}', NULL);

INSERT INTO sheets_torture.generated_values (serial_no, quantity, unit_price, locked_note, frozen_code, secret_note) VALUES
  (DEFAULT, 3, 19.99, NULL, 'A-1', 'hidden'),
  (100, 1, 0.01, 'note', NULL, NULL);

INSERT INTO sheets_torture.countries (iso_code, name) VALUES
  ('US', 'United States'),
  ('FR', 'France'),
  ('JP', 'Japan');

INSERT INTO sheets_torture.warehouse_items (warehouse_code, sku, quantity) VALUES
  ('east', 'SKU-1', 10),
  ('east', 'SKU-2', 0),
  ('west', 'SKU-1', 5);

INSERT INTO sheets_torture.audit_events (happened_at, actor, message) VALUES
  ('2024-01-01 00:00:00+00', 'system', 'seeded'),
  ('2024-01-01 00:00:00+00', 'system', 'seeded'),
  ('2024-01-02 00:00:00+00', NULL, 'anonymous change');

INSERT INTO sheets_torture.people (id, email, full_name, manager_id) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'ada@example.com', 'Ada Lovelace', NULL),
  ('00000000-0000-4000-8000-0000000000a2', 'grace@example.com', 'Grace Hopper', '00000000-0000-4000-8000-0000000000a1'),
  ('00000000-0000-4000-8000-0000000000a3', 'linus@example.com', 'Linus Torvalds', '00000000-0000-4000-8000-0000000000a1');

INSERT INTO sheets_torture.person_profiles (person_id, bio, photo) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'First programmer', '{"url": "https://cdn.example.com/ada.png"}'),
  ('00000000-0000-4000-8000-0000000000a2', NULL, NULL);

INSERT INTO sheets_torture.projects (id, name, owner_id, reviewer_id, country_code) VALUES
  (1, 'Analytical Engine', '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2', 'US'),
  (2, 'Compiler', '00000000-0000-4000-8000-0000000000a2', NULL, NULL),
  (3, 'Kernel', '00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-0000000000a3', 'FR');

INSERT INTO sheets_torture.tasks (id, project_id, title, status, review_status, priority, assignee_email, warehouse_code, sku, due_on) VALUES
  (1, 1, 'Design the mill', 'in_progress', 'todo', 'high', 'ADA@example.com', 'east', 'SKU-1', '2024-03-01'),
  (2, 1, 'Punch the cards', '1st_review', NULL, NULL, NULL, NULL, NULL, NULL),
  (3, 2, 'Write the linker', 'done_ish', 'Blocked', 'low', 'grace@example.com', 'west', 'SKU-1', NULL),
  (4, 3, 'Merge the patches', 'done', 'done', 'medium', 'linus@example.com', NULL, NULL, '1991-08-25'),
  (5, 3, 'Wait for the merge window', 'on hold', 'needs-review', NULL, NULL, NULL, NULL, NULL);

INSERT INTO sheets_torture.labels (id, name, color) VALUES
  (1, 'urgent', '#ff0000'),
  (2, 'backend', NULL),
  (3, 'docs', '#00ff00');

INSERT INTO sheets_torture.task_labels (task_id, label_id) VALUES
  (1, 1),
  (1, 2),
  (3, 2);

INSERT INTO sheets_torture.project_members (project_id, person_id, role, joined_on) VALUES
  (1, '00000000-0000-4000-8000-0000000000a1', 'owner', '1842-01-01'),
  (1, '00000000-0000-4000-8000-0000000000a2', 'reviewer', '1952-01-01'),
  (3, '00000000-0000-4000-8000-0000000000a3', 'owner', '1991-08-25');

INSERT INTO sheets_torture.app_buckets (id, key, is_public, allowed_mime_types, max_file_size) VALUES
  ('00000000-0000-4000-8000-0000000000b1', 'public', true, ARRAY['image/png', 'image/jpeg'], 10485760),
  ('00000000-0000-4000-8000-0000000000b2', 'private', false, NULL, NULL);

INSERT INTO sheets_torture.app_files (id, bucket_id, key, content_hash, mime_type, size, filename, status) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b1', 'avatars/a.png', repeat('a', 64), 'image/png', 2048, 'a.png', 'uploaded'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000b2', 'gallery/1.jpg', repeat('b', 64), 'image/jpeg', 4096, NULL, 'requested');

INSERT INTO sheets_torture.special_values (label, real_value, double_value, numeric_value, timestamptz_value, date_value) VALUES
  ('not a number', 'NaN', 'NaN', 'NaN', NULL, NULL),
  ('infinite', 'Infinity', '-Infinity', 'Infinity', 'infinity', '-infinity'),
  ('finite', 1.5, -2.5, 3.5, '2024-01-01 00:00:00+00', '2024-01-01');

SELECT setval(pg_get_serial_sequence('sheets_torture.tasks', 'id'), 100);
SELECT setval(pg_get_serial_sequence('sheets_torture.labels', 'id'), 100);
SELECT setval(pg_get_serial_sequence('sheets_torture.projects', 'id'), 100);
