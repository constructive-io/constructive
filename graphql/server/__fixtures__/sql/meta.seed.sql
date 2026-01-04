BEGIN;

INSERT INTO collections_public.database (id, name)
VALUES ('0b22e268-16d6-582b-950a-24e108688849', 'meta-test');

INSERT INTO meta_public.apis (id, database_id, name, is_public, role_name, anon_role)
VALUES
  ('ee00f3ca-aeed-4b5e-a0ad-ac9668e4275f', '0b22e268-16d6-582b-950a-24e108688849', 'public', true, 'authenticated', 'anonymous'),
  ('777d373e-104a-48af-bf2a-713406d0a965', '0b22e268-16d6-582b-950a-24e108688849', 'private', false, 'administrator', 'administrator');

INSERT INTO meta_public.domains (id, database_id, api_id, domain, subdomain)
VALUES
  ('7d5abbd9-4b0c-4ace-bcf8-50b4d9d6f0df', '0b22e268-16d6-582b-950a-24e108688849', 'ee00f3ca-aeed-4b5e-a0ad-ac9668e4275f', 'constructive.io', 'api'),
  ('45ba9888-7709-417e-9d16-34e28a28f945', '0b22e268-16d6-582b-950a-24e108688849', '777d373e-104a-48af-bf2a-713406d0a965', 'constructive.io', 'meta');

INSERT INTO meta_public.api_extensions (id, database_id, api_id, schema_name)
VALUES
  ('00d38b99-ea6e-4ec3-9035-96a6fae34a1f', '0b22e268-16d6-582b-950a-24e108688849', 'ee00f3ca-aeed-4b5e-a0ad-ac9668e4275f', 'collections_public'),
  ('baee7eca-a010-4b3a-90f5-502e658b791f', '0b22e268-16d6-582b-950a-24e108688849', 'ee00f3ca-aeed-4b5e-a0ad-ac9668e4275f', 'meta_public'),
  ('aeab326d-a5ad-4e2e-8d61-312523b584dd', '0b22e268-16d6-582b-950a-24e108688849', '777d373e-104a-48af-bf2a-713406d0a965', 'collections_public'),
  ('847d9cf6-ff59-46a8-a0a8-d92293f279c1', '0b22e268-16d6-582b-950a-24e108688849', '777d373e-104a-48af-bf2a-713406d0a965', 'meta_public');

COMMIT;
