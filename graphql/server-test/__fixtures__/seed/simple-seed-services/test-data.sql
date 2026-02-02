-- Test data for simple-seed-services scenario
-- Inserts metaschema data, services data, and 5 animals

-- Use replica mode to bypass triggers/constraints during seed
SET session_replication_role TO replica;

-- =====================================================
-- METASCHEMA DATA
-- =====================================================

-- Database entry (ID matches servicesDatabaseId in test file)
INSERT INTO metaschema_public.database (id, owner_id, name, hash)
VALUES (
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'simple-pets',
  '425a0f10-0170-5760-85df-2a980c378224'
) ON CONFLICT (id) DO NOTHING;

-- Schema entries
INSERT INTO metaschema_public.schema (id, database_id, name, schema_name, description, is_public)
VALUES
  ('6dbae92a-5450-401b-1ed5-d69e7754940d', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'public', 'simple-pets-public', NULL, true),
  ('6dba9876-043f-48ee-399d-ddc991ad978d', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'private', 'simple-pets-private', NULL, false),
  ('6dba6f21-0193-43f4-3bdb-61b4b956b6b6', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'pets_public', 'simple-pets-pets-public', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- Table entry for animals
INSERT INTO metaschema_public.table (id, database_id, schema_id, name, description)
VALUES (
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba6f21-0193-43f4-3bdb-61b4b956b6b6',
  'animals',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Field entries for animals table
INSERT INTO metaschema_public.field (id, database_id, table_id, name, type, description)
VALUES
  ('6dbace4d-bcf9-4d55-e363-6b24623f0d8a', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba36e9-b098-4157-1b4c-e5b6e3a885de', 'id', 'uuid', NULL),
  ('6dbae9c7-3460-4f65-8290-b2a8e05eb714', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba36e9-b098-4157-1b4c-e5b6e3a885de', 'name', 'text', NULL),
  ('6dbacc68-876e-4ece-b190-706819ae4f00', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba36e9-b098-4157-1b4c-e5b6e3a885de', 'species', 'text', NULL),
  ('6dba080e-bb3f-4556-8ca7-425ceb98a519', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba36e9-b098-4157-1b4c-e5b6e3a885de', 'owner_id', 'uuid', NULL)
ON CONFLICT (id) DO NOTHING;

-- Primary key constraint
INSERT INTO metaschema_public.primary_key_constraint (id, database_id, table_id, name, type, field_ids)
VALUES (
  '6dbaeb74-b5cf-46d5-4724-6ab26c27da2d',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
  'animals_pkey',
  'p',
  '{6dbace4d-bcf9-4d55-e363-6b24623f0d8a}'
) ON CONFLICT (id) DO NOTHING;

-- Check constraints
INSERT INTO metaschema_public.check_constraint (id, database_id, table_id, name, type, field_ids, expr)
VALUES
  (
    '6dbade3d-1f49-4535-148f-a55415f91990',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
    'animals_name_chk',
    'c',
    '{6dbae9c7-3460-4f65-8290-b2a8e05eb714}',
    '{"A_Expr":{"kind":"AEXPR_OP","name":[{"String":{"sval":"<="}}],"lexpr":{"FuncCall":{"args":[{"ColumnRef":{"fields":[{"String":{"sval":"name"}}]}}],"funcname":[{"String":{"sval":"character_length"}}]}},"rexpr":{"A_Const":{"ival":256}}}}'
  ),
  (
    '6dba5892-fa63-4c33-b067-43d07fc93032',
    '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
    '6dba36e9-b098-4157-1b4c-e5b6e3a885de',
    'animals_species_chk',
    'c',
    '{6dbacc68-876e-4ece-b190-706819ae4f00}',
    '{"A_Expr":{"kind":"AEXPR_OP","name":[{"String":{"sval":"<="}}],"lexpr":{"FuncCall":{"args":[{"ColumnRef":{"fields":[{"String":{"sval":"species"}}]}}],"funcname":[{"String":{"sval":"character_length"}}]}},"rexpr":{"A_Const":{"ival":100}}}}'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SERVICES DATA
-- =====================================================

-- API entries
-- "app" API - public, used for domain lookup via Host header (app.test.constructive.io)
-- "private" API - private, used for X-Api-Name lookup
-- Additional APIs for coverage
INSERT INTO services_public.apis (id, database_id, name, dbname, is_public, role_name, anon_role)
VALUES
  ('6c9997a4-591b-4cb3-9313-4ef45d6f134e', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'app', current_database(), true, 'authenticated', 'anonymous'),
  ('e257c53d-6ba6-40de-b679-61b37188a316', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'private', current_database(), false, 'administrator', 'administrator'),
  ('28199444-da40-40b1-8a4c-53edbf91c738', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'public', current_database(), true, 'authenticated', 'anonymous'),
  ('cc1e8389-e69d-4e12-9089-a98bf11fc75f', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'admin', current_database(), true, 'authenticated', 'anonymous'),
  ('a2e6098f-2c11-4f2a-b481-c19175bc62ef', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', 'auth', current_database(), true, 'authenticated', 'anonymous')
ON CONFLICT (id) DO NOTHING;

-- Domain entry - maps app.test.constructive.io to the "app" API
-- Note: URL parser sees "app.test.constructive.io" as domain=constructive.io, subdomain=app.test
INSERT INTO services_public.domains (id, database_id, site_id, api_id, domain, subdomain)
VALUES (
  '41181146-890e-4991-9da7-3dddf87d9e78',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  '6c9997a4-591b-4cb3-9313-4ef45d6f134e',
  'constructive.io',
  'app.test'
) ON CONFLICT (id) DO NOTHING;

-- Domain entry for private API fallback test (Q3 Sub-D)
-- Note: URL parser sees "private.test.constructive.io" as domain=constructive.io, subdomain=private.test
INSERT INTO services_public.domains (id, database_id, site_id, api_id, domain, subdomain)
VALUES (
  '51181146-890e-4991-9da7-3dddf87d9e79',
  '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9',
  NULL,
  'e257c53d-6ba6-40de-b679-61b37188a316',
  'constructive.io',
  'private.test'
) ON CONFLICT (id) DO NOTHING;

-- API Schemas - link APIs to schemas
INSERT INTO services_public.api_schemas (id, database_id, schema_id, api_id)
VALUES
  -- app API schemas
  ('71181146-890e-4991-9da7-3dddf87d9e01', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dbae92a-5450-401b-1ed5-d69e7754940d', '6c9997a4-591b-4cb3-9313-4ef45d6f134e'),
  ('71181146-890e-4991-9da7-3dddf87d9e02', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba6f21-0193-43f4-3bdb-61b4b956b6b6', '6c9997a4-591b-4cb3-9313-4ef45d6f134e'),
  -- private API schemas
  ('71181146-890e-4991-9da7-3dddf87d9e03', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dbae92a-5450-401b-1ed5-d69e7754940d', 'e257c53d-6ba6-40de-b679-61b37188a316'),
  ('71181146-890e-4991-9da7-3dddf87d9e04', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba9876-043f-48ee-399d-ddc991ad978d', 'e257c53d-6ba6-40de-b679-61b37188a316'),
  ('71181146-890e-4991-9da7-3dddf87d9e05', '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9', '6dba6f21-0193-43f4-3bdb-61b4b956b6b6', 'e257c53d-6ba6-40de-b679-61b37188a316')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TEST DATA (ANIMALS)
-- =====================================================

-- Insert 5 animals: 2 Dogs, 2 Cats, 1 Bird
INSERT INTO "simple-pets-pets-public".animals (id, name, species, owner_id, created_at, updated_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Buddy', 'Dog', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000002', 'Max', 'Dog', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000003', 'Whiskers', 'Cat', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000004', 'Mittens', 'Cat', NULL, now(), now()),
  ('a0000001-0000-0000-0000-000000000005', 'Tweety', 'Bird', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Reset replication role
SET session_replication_role TO DEFAULT;
