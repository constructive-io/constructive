import { Pool } from 'pg';
import { resolveSecretsForJob } from '../src/secrets';

// This test is intended as a high-level integration sanity check
// when running against a real docker-compose stack (Postgres +
// Constructive server + jobs + OpenBao/Vault dev instance).
//
// It assumes:
// - Postgres is available according to PG* env vars
// - The secrets-meta module is installed
// - OpenBao/Vault is reachable via OPENBAO_ADDR/VAULT_ADDR
//
// The test seeds:
// - a secrets provider row (openbao)
// - a secrets metadata row
// - a job with matching secretRefs
// - a KV secret in OpenBao matching provider_ref
//
// Because environments vary, this test is skipped by default. You
// can enable it locally by setting RUN_JOBS_SECRETS_E2E=1.

const shouldRun = process.env.RUN_JOBS_SECRETS_E2E === '1';

(shouldRun ? describe : describe.skip)('jobs secrets e2e (OpenBao)', () => {
  let pool: Pool;
 
   beforeAll(() => {
    pool = new Pool({
      host: process.env.PGHOST ?? 'localhost',
      port: Number(process.env.PGPORT ?? '5432'),
      user: process.env.PGUSER ?? 'postgres',
      password: process.env.PGPASSWORD ?? 'password',
      database: process.env.PGDATABASE ?? 'launchql'
    });
   });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('seeds provider, metadata, job and resolves via OpenBao', async () => {
    const client = await pool.connect();
    try {
      // 1) Ensure we have a database_id and app_id for linking metadata
      const { rows: dbRows } = await client.query(
        `select id as database_id from collections_public.database order by id limit 1`
       );
      if (dbRows.length === 0) {
        throw new Error('No collections_public.database rows found; seed app DB first');
      }
      const databaseId: string = dbRows[0].database_id;

      const { rows: appRows } = await client.query(
        `select id as app_id from meta_public.apps where database_id = $1 order by id limit 1`,
        [databaseId]
      );
      if (appRows.length === 0) {
        throw new Error('No meta_public.apps rows found for database; seed meta apps first');
      }
      const appId: string = appRows[0].app_id;

      // 2) Seed / find an OpenBao provider
      const providerName = 'openbao-e2e-provider';
      const providerType = 'openbao';

      const providerConfig = {
        vaultAddress:
          process.env.OPENBAO_ADDR ||
          process.env.VAULT_ADDR ||
          'http://localhost:8200',
        mountPath: process.env.OPENBAO_MOUNT_PATH || 'secret',
        runtimeToken:
          process.env.OPENBAO_RUNTIME_TOKEN ||
          process.env.VAULT_RUNTIME_TOKEN ||
          process.env.OPENBAO_MANAGEMENT_TOKEN ||
          process.env.VAULT_TOKEN ||
          'root'
      };

      const existingProvider = await client.query(
        `select id from meta_public.secret_providers where name = $1 limit 1`,
        [providerName]
      );
 
      let providerId: string;
      if (existingProvider.rows.length > 0) {
        const providerUpdate = await client.query(
          `update meta_public.secret_providers
             set provider_type = $2,
                 config = $3::jsonb,
                 updated_at = current_timestamp
           where id = $1
           returning id`,
          [existingProvider.rows[0].id, providerType, JSON.stringify(providerConfig)]
        );
        providerId = providerUpdate.rows[0].id;
      } else {
        const providerInsert = await client.query(
          `insert into meta_public.secret_providers (name, provider_type, config)
           values ($1, $2, $3::jsonb)
           returning id`,
          [providerName, providerType, JSON.stringify(providerConfig)]
        );
        providerId = providerInsert.rows[0].id;
      }


      // 3) Seed a secret metadata row
      const ownerType = 'app';
      const ownerId = appId; // treat the app as the owner for this test

      // Use a unique key per test run to avoid violating the
      // secrets_owner_app_key_norm_uniq constraint if a previous
      // test left state behind in the database.
      const keyBase = 'E2E_TEST_SECRET';
      const key = `${keyBase}_${Date.now().toString(36)}`;
      const providerRef = `tests/${databaseId}/${key.toLowerCase()}`;

      const secretResult = await client.query(
        `select * from meta_public.create_secret_metadata($1,$2,$3,$4,$5,$6,$7)`,
        [
          ownerType,
          ownerId,
          appId,
          key,
          providerId,
          providerRef,
          'e2e test secret (OpenBao)'
        ]
      );
      const secretId: string = secretResult.rows[0].id;

      // 4) Seed a job with matching secretRefs in the payload
      const taskIdentifier = 'simple-email';
      const payload = {
        to: 'user@example.com',
        subject: 'E2E secrets test',
        html: '<p>testing secrets</p>',
        secretRefs: {
          [key]: {
            ownerType,
            ownerId,
            appId,
            key
          }
        }
      };

      const jobInsert = await client.query(
        `insert into app_jobs.jobs (database_id, task_identifier, payload)
         values ($1, $2, $3::jsonb)
         returning id`,
        [databaseId, taskIdentifier, JSON.stringify(payload)]
      );
      const jobId: number = jobInsert.rows[0].id;

      // 5) Seed the secret value into OpenBao via HTTP API
      const vaultAddr =
        process.env.OPENBAO_ADDR ||
        process.env.VAULT_ADDR ||
        'http://localhost:8200';
      const token =
        process.env.OPENBAO_RUNTIME_TOKEN ||
        process.env.VAULT_RUNTIME_TOKEN ||
        process.env.OPENBAO_MANAGEMENT_TOKEN ||
        process.env.VAULT_TOKEN ||
        'root';

      const url = `${vaultAddr.replace(/\/$/, '')}/v1/${
        providerConfig.mountPath
      }/data/${providerRef}`;

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': token
        },
        body: JSON.stringify({ data: { value: 'super-secret-e2e-value' } })
      });

      // 6) Finally, resolve via the runtime helper
      const secrets = await resolveSecretsForJob(client, jobId);

      expect(secrets).toBeTruthy();
      expect(secrets[key]).toBe('super-secret-e2e-value');

      // Best-effort cleanup (idempotent-ish if run repeatedly)
      await client.query(`delete from app_jobs.jobs where id = $1`, [jobId]);
      await client.query(`delete from meta_public.secrets where id = $1`, [secretId]);
      // provider row is kept (can be reused across runs)
    } finally {
      client.release();
    }
  });
});


