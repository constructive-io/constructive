/**
 * infra-secrets integration tests
 *
 * Simulates 5 functions from constructive-functions and validates
 * the secret resolution cascade (org-scoped → global fallback).
 *
 * Tables are created in-test to mirror the infra_public + constructive_store_private
 * schemas without requiring a full pgpm deploy of both modules.
 */
jest.setTimeout(30000);

import { getConnections, type PgTestClient } from 'pgsql-test';
import {
  resolveSecrets,
  resolveSecretsMap,
  SecretResolutionError
} from '../src';

let pg: PgTestClient;
let teardown: () => Promise<void>;

// Test fixture IDs
const DB_ID_ORG_A = '00000000-0000-0000-0000-00000000aa01';
const DB_ID_ORG_B = '00000000-0000-0000-0000-00000000bb01';

// Function definition IDs (will be populated after insert)
let fn_send_verification_link: string;
let fn_send_email: string;
let fn_send_email_link: string;
let fn_simple_email: string;
let fn_process_file_embedding: string;

beforeAll(async () => {
  ({ pg, teardown } = await getConnections({ db: { extensions: ['pgcrypto'] } }));

  // Create infra_public schema + tables (mirrors packages/infra)
  await pg.query(`CREATE SCHEMA IF NOT EXISTS infra_public`);

  await pg.query(`
    CREATE TABLE infra_public.default_function_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      scope text NOT NULL,
      name text NOT NULL,
      task_identifier text GENERATED ALWAYS AS (scope || ':' || name) STORED,
      description text,
      is_invocable boolean NOT NULL DEFAULT false,
      max_attempts integer NOT NULL DEFAULT 25,
      priority integer NOT NULL DEFAULT 0,
      queue_name text NOT NULL DEFAULT 'default',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(scope, name)
    )
  `);

  await pg.query(`
    CREATE TABLE infra_public.function_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      database_id uuid NOT NULL,
      scope text NOT NULL,
      name text NOT NULL,
      task_identifier text GENERATED ALWAYS AS (scope || ':' || name) STORED,
      description text,
      is_invocable boolean NOT NULL DEFAULT false,
      max_attempts integer NOT NULL DEFAULT 25,
      priority integer NOT NULL DEFAULT 0,
      queue_name text NOT NULL DEFAULT 'default',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(database_id, scope, name)
    )
  `);

  await pg.query(`
    CREATE TABLE infra_public.secret_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      description text,
      is_required boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pg.query(`
    CREATE TABLE infra_public.function_secret_requirements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      default_function_id uuid REFERENCES infra_public.default_function_definitions(id) ON DELETE CASCADE,
      function_id uuid REFERENCES infra_public.function_definitions(id) ON DELETE CASCADE,
      secret_definition_id uuid NOT NULL REFERENCES infra_public.secret_definitions(id) ON DELETE CASCADE,
      is_optional boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT one_function_ref CHECK (
        (default_function_id IS NOT NULL AND function_id IS NULL)
        OR (default_function_id IS NULL AND function_id IS NOT NULL)
      ),
      UNIQUE(default_function_id, secret_definition_id),
      UNIQUE(function_id, secret_definition_id)
    )
  `);

  // Create constructive_store_private schema + app_secrets table
  await pg.query(`CREATE SCHEMA IF NOT EXISTS constructive_store_private`);

  await pg.query(`
    CREATE TABLE constructive_store_private.app_secrets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      namespace text NOT NULL DEFAULT 'default',
      name text NOT NULL,
      value bytea,
      algo text NOT NULL DEFAULT 'crypt',
      key_id uuid,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(namespace, name)
    )
  `);

  // Create a simplified app_secrets_get function (no pgp, just crypt/plain)
  await pg.query(`
    CREATE FUNCTION constructive_store_private.app_secrets_get(
      IN secret_name text,
      IN default_value text DEFAULT NULL,
      IN secret_namespace text DEFAULT 'default'
    ) RETURNS text AS $$
    DECLARE
      v_secret constructive_store_private.app_secrets;
    BEGIN
      SELECT *
      FROM constructive_store_private.app_secrets AS s
      WHERE s.namespace = app_secrets_get.secret_namespace
        AND s.name = app_secrets_get.secret_name
      INTO v_secret;

      IF NOT FOUND OR v_secret IS NULL THEN
        RETURN app_secrets_get.default_value;
      END IF;

      RETURN convert_from(v_secret.value, 'SQL_ASCII');
    END;
    $$ LANGUAGE plpgsql STABLE
  `);

  // ------------------------------------------------------------------
  // Seed: secret definitions (matching real constructive-functions usage)
  // ------------------------------------------------------------------
  await pg.query(`
    INSERT INTO infra_public.secret_definitions (name, description, is_required) VALUES
      ('SMTP_HOST', 'SMTP server hostname', true),
      ('SMTP_PASSWORD', 'SMTP authentication password', true),
      ('FROM_EMAIL', 'Default sender email address', true),
      ('MAILGUN_API_KEY', 'Mailgun API key for email delivery', false),
      ('MAILGUN_DOMAIN', 'Mailgun sending domain', false),
      ('OPENAI_API_KEY', 'OpenAI API key for embeddings and inference', false),
      ('GRAPHQL_AUTH_TOKEN', 'Auth token for internal GraphQL calls', false)
  `);

  // ------------------------------------------------------------------
  // Seed: function definitions (5 functions from constructive-functions)
  // ------------------------------------------------------------------
  const fns = await pg.query<{ id: string; name: string }>(`
    INSERT INTO infra_public.default_function_definitions
      (scope, name, description, is_invocable, queue_name, priority) VALUES
      ('email', 'send_verification_link', 'Send email verification link', false, 'email', 1),
      ('email', 'send_email', 'Generic email send via SMTP/Mailgun', false, 'email', 1),
      ('email', 'send_email_link', 'Send a link-based email notification', false, 'email', 1),
      ('email', 'simple_email', 'Simple transactional email', false, 'email', 1),
      ('embed', 'process_file_embedding', 'Generate embeddings for uploaded file', true, 'ai', 3)
    RETURNING id, name
  `);

  fn_send_verification_link = fns.rows.find(r => r.name === 'send_verification_link')!.id;
  fn_send_email = fns.rows.find(r => r.name === 'send_email')!.id;
  fn_send_email_link = fns.rows.find(r => r.name === 'send_email_link')!.id;
  fn_simple_email = fns.rows.find(r => r.name === 'simple_email')!.id;
  fn_process_file_embedding = fns.rows.find(r => r.name === 'process_file_embedding')!.id;

  // ------------------------------------------------------------------
  // Seed: function → secret requirements
  // ------------------------------------------------------------------

  // Email functions require SMTP + FROM_EMAIL, optionally Mailgun
  await pg.query(`
    INSERT INTO infra_public.function_secret_requirements
      (default_function_id, secret_definition_id, is_optional)
    SELECT dfd.id, sd.id, false
    FROM infra_public.default_function_definitions dfd
    CROSS JOIN infra_public.secret_definitions sd
    WHERE dfd.scope = 'email'
      AND sd.name IN ('SMTP_HOST', 'SMTP_PASSWORD', 'FROM_EMAIL')
  `);

  // Email functions optionally use MAILGUN_API_KEY + MAILGUN_DOMAIN
  await pg.query(`
    INSERT INTO infra_public.function_secret_requirements
      (default_function_id, secret_definition_id, is_optional)
    SELECT dfd.id, sd.id, true
    FROM infra_public.default_function_definitions dfd
    CROSS JOIN infra_public.secret_definitions sd
    WHERE dfd.scope = 'email'
      AND sd.name IN ('MAILGUN_API_KEY', 'MAILGUN_DOMAIN')
  `);

  // Email functions optionally use GRAPHQL_AUTH_TOKEN
  await pg.query(`
    INSERT INTO infra_public.function_secret_requirements
      (default_function_id, secret_definition_id, is_optional)
    SELECT dfd.id, sd.id, true
    FROM infra_public.default_function_definitions dfd
    CROSS JOIN infra_public.secret_definitions sd
    WHERE dfd.scope = 'email'
      AND sd.name = 'GRAPHQL_AUTH_TOKEN'
  `);

  // Embedding function requires OPENAI_API_KEY
  await pg.query(`
    INSERT INTO infra_public.function_secret_requirements
      (default_function_id, secret_definition_id, is_optional)
    SELECT dfd.id, sd.id, false
    FROM infra_public.default_function_definitions dfd
    CROSS JOIN infra_public.secret_definitions sd
    WHERE dfd.name = 'process_file_embedding'
      AND sd.name = 'OPENAI_API_KEY'
  `);

  // ------------------------------------------------------------------
  // Seed: app_secrets (global platform secrets in 'default' namespace)
  // ------------------------------------------------------------------
  await pg.query(`
    INSERT INTO constructive_store_private.app_secrets (namespace, name, value, algo) VALUES
      ('default', 'SMTP_HOST', 'smtp.mailgun.org'::bytea, 'crypt'),
      ('default', 'SMTP_PASSWORD', 'global-smtp-password-123'::bytea, 'crypt'),
      ('default', 'FROM_EMAIL', 'no-reply@constructive.io'::bytea, 'crypt'),
      ('default', 'OPENAI_API_KEY', 'sk-global-openai-key'::bytea, 'crypt'),
      ('default', 'MAILGUN_API_KEY', 'key-global-mailgun'::bytea, 'crypt'),
      ('default', 'MAILGUN_DOMAIN', 'mg.constructive.io'::bytea, 'crypt')
  `);

  // Seed: org-specific secrets for ORG_A (overrides global SMTP_HOST + FROM_EMAIL)
  await pg.query(`
    INSERT INTO constructive_store_private.app_secrets (namespace, name, value, algo) VALUES
      ($1, 'SMTP_HOST', 'smtp.org-a-custom.com'::bytea, 'crypt'),
      ($1, 'FROM_EMAIL', 'hello@org-a.com'::bytea, 'crypt'),
      ($1, 'GRAPHQL_AUTH_TOKEN', 'bearer-org-a-token-xyz'::bytea, 'crypt')
  `, [DB_ID_ORG_A]);
});

afterAll(() => teardown());

// ---------------------------------------------------------------------------
// Tests: send_verification_link
// ---------------------------------------------------------------------------
describe('send_verification_link', () => {
  it('resolves all required secrets from global namespace', async () => {
    const secrets = await resolveSecrets(pg, fn_send_verification_link, DB_ID_ORG_B);

    const smtp_host = secrets.find(s => s.name === 'SMTP_HOST');
    const smtp_pass = secrets.find(s => s.name === 'SMTP_PASSWORD');
    const from_email = secrets.find(s => s.name === 'FROM_EMAIL');

    expect(smtp_host).toMatchObject({ value: 'smtp.mailgun.org', source: 'global' });
    expect(smtp_pass).toMatchObject({ value: 'global-smtp-password-123', source: 'global' });
    expect(from_email).toMatchObject({ value: 'no-reply@constructive.io', source: 'global' });
  });

  it('resolves org-scoped secrets with cascade for ORG_A', async () => {
    const secrets = await resolveSecrets(pg, fn_send_verification_link, DB_ID_ORG_A);

    const smtp_host = secrets.find(s => s.name === 'SMTP_HOST');
    const smtp_pass = secrets.find(s => s.name === 'SMTP_PASSWORD');
    const from_email = secrets.find(s => s.name === 'FROM_EMAIL');
    const auth_token = secrets.find(s => s.name === 'GRAPHQL_AUTH_TOKEN');

    // Org-A has custom SMTP_HOST and FROM_EMAIL
    expect(smtp_host).toMatchObject({ value: 'smtp.org-a-custom.com', source: 'database' });
    expect(from_email).toMatchObject({ value: 'hello@org-a.com', source: 'database' });
    // SMTP_PASSWORD falls back to global
    expect(smtp_pass).toMatchObject({ value: 'global-smtp-password-123', source: 'global' });
    // GRAPHQL_AUTH_TOKEN is org-scoped
    expect(auth_token).toMatchObject({ value: 'bearer-org-a-token-xyz', source: 'database' });
  });

  it('resolves optional secrets as null when not available', async () => {
    // ORG_B has no GRAPHQL_AUTH_TOKEN
    const secrets = await resolveSecrets(pg, fn_send_verification_link, DB_ID_ORG_B);
    const auth_token = secrets.find(s => s.name === 'GRAPHQL_AUTH_TOKEN');
    expect(auth_token).toMatchObject({ value: null, source: null });
  });
});

// ---------------------------------------------------------------------------
// Tests: send_email
// ---------------------------------------------------------------------------
describe('send_email', () => {
  it('resolves the same required secrets as send_verification_link', async () => {
    const secrets = await resolveSecretsMap(pg, fn_send_email, DB_ID_ORG_B);

    expect(secrets.SMTP_HOST).toBe('smtp.mailgun.org');
    expect(secrets.SMTP_PASSWORD).toBe('global-smtp-password-123');
    expect(secrets.FROM_EMAIL).toBe('no-reply@constructive.io');
    expect(secrets.MAILGUN_API_KEY).toBe('key-global-mailgun');
    expect(secrets.MAILGUN_DOMAIN).toBe('mg.constructive.io');
  });

  it('returns flat map without null optional secrets', async () => {
    const secrets = await resolveSecretsMap(pg, fn_send_email, DB_ID_ORG_B);
    // GRAPHQL_AUTH_TOKEN not set for ORG_B → omitted from map
    expect(secrets).not.toHaveProperty('GRAPHQL_AUTH_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// Tests: send_email_link
// ---------------------------------------------------------------------------
describe('send_email_link', () => {
  it('resolves secrets with org cascade', async () => {
    const secrets = await resolveSecretsMap(pg, fn_send_email_link, DB_ID_ORG_A);

    // Org-A overrides
    expect(secrets.SMTP_HOST).toBe('smtp.org-a-custom.com');
    expect(secrets.FROM_EMAIL).toBe('hello@org-a.com');
    expect(secrets.GRAPHQL_AUTH_TOKEN).toBe('bearer-org-a-token-xyz');
    // Global fallback
    expect(secrets.SMTP_PASSWORD).toBe('global-smtp-password-123');
    expect(secrets.MAILGUN_API_KEY).toBe('key-global-mailgun');
  });
});

// ---------------------------------------------------------------------------
// Tests: simple_email
// ---------------------------------------------------------------------------
describe('simple_email', () => {
  it('has same secret requirements as other email functions', async () => {
    const secrets = await resolveSecrets(pg, fn_simple_email, DB_ID_ORG_B);
    const names = secrets.map(s => s.name).sort();
    expect(names).toEqual([
      'FROM_EMAIL',
      'GRAPHQL_AUTH_TOKEN',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'SMTP_HOST',
      'SMTP_PASSWORD'
    ]);
  });
});

// ---------------------------------------------------------------------------
// Tests: process_file_embedding
// ---------------------------------------------------------------------------
describe('process_file_embedding', () => {
  it('resolves OPENAI_API_KEY from global', async () => {
    const secrets = await resolveSecretsMap(pg, fn_process_file_embedding, DB_ID_ORG_B);
    expect(secrets).toEqual({ OPENAI_API_KEY: 'sk-global-openai-key' });
  });

  it('throws in strict mode when required secret is missing', async () => {
    // Remove the global OPENAI_API_KEY
    await pg.query(
      `DELETE FROM constructive_store_private.app_secrets
       WHERE namespace = 'default' AND name = 'OPENAI_API_KEY'`
    );

    await expect(
      resolveSecrets(pg, fn_process_file_embedding, DB_ID_ORG_B)
    ).rejects.toThrow(SecretResolutionError);

    // Restore
    await pg.query(`
      INSERT INTO constructive_store_private.app_secrets (namespace, name, value, algo)
      VALUES ('default', 'OPENAI_API_KEY', 'sk-global-openai-key'::bytea, 'crypt')
    `);
  });

  it('returns null in non-strict mode when required secret is missing', async () => {
    await pg.query(
      `DELETE FROM constructive_store_private.app_secrets
       WHERE namespace = 'default' AND name = 'OPENAI_API_KEY'`
    );

    const secrets = await resolveSecrets(
      pg, fn_process_file_embedding, DB_ID_ORG_B,
      'constructive_store_private',
      { strict: false }
    );
    const openai = secrets.find(s => s.name === 'OPENAI_API_KEY');
    expect(openai).toMatchObject({ value: null, source: null });

    // Restore
    await pg.query(`
      INSERT INTO constructive_store_private.app_secrets (namespace, name, value, algo)
      VALUES ('default', 'OPENAI_API_KEY', 'sk-global-openai-key'::bytea, 'crypt')
    `);
  });

  it('prefers org-scoped OPENAI_API_KEY over global', async () => {
    // Org A sets their own OpenAI key
    await pg.query(`
      INSERT INTO constructive_store_private.app_secrets (namespace, name, value, algo)
      VALUES ($1, 'OPENAI_API_KEY', 'sk-org-a-private-key'::bytea, 'crypt')
    `, [DB_ID_ORG_A]);

    const secrets = await resolveSecretsMap(pg, fn_process_file_embedding, DB_ID_ORG_A);
    expect(secrets.OPENAI_API_KEY).toBe('sk-org-a-private-key');

    // ORG_B still gets global
    const secrets_b = await resolveSecretsMap(pg, fn_process_file_embedding, DB_ID_ORG_B);
    expect(secrets_b.OPENAI_API_KEY).toBe('sk-global-openai-key');
  });
});

// ---------------------------------------------------------------------------
// Tests: edge cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
  it('returns empty array for function with no secret requirements', async () => {
    // Insert a function with no secret requirements
    const { rows } = await pg.query<{ id: string }>(`
      INSERT INTO infra_public.default_function_definitions
        (scope, name, description, is_invocable)
      VALUES ('test', 'no_secrets_fn', 'Function with no secrets', true)
      RETURNING id
    `);

    const secrets = await resolveSecrets(pg, rows[0].id, DB_ID_ORG_A);
    expect(secrets).toEqual([]);
  });

  it('resolves for database-scoped function definitions', async () => {
    // Insert a database-scoped function definition
    const { rows: fn_rows } = await pg.query<{ id: string }>(`
      INSERT INTO infra_public.function_definitions
        (database_id, scope, name, description, is_invocable)
      VALUES ($1, 'custom', 'org_specific_fn', 'Org-specific function', true)
      RETURNING id
    `, [DB_ID_ORG_A]);

    const fn_id = fn_rows[0].id;

    // Link it to OPENAI_API_KEY
    await pg.query(`
      INSERT INTO infra_public.function_secret_requirements
        (function_id, secret_definition_id, is_optional)
      SELECT $1, sd.id, false
      FROM infra_public.secret_definitions sd
      WHERE sd.name = 'OPENAI_API_KEY'
    `, [fn_id]);

    const secrets = await resolveSecretsMap(pg, fn_id, DB_ID_ORG_A);
    expect(secrets.OPENAI_API_KEY).toBe('sk-org-a-private-key');
  });
});
