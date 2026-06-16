#!/usr/bin/env node

import path from 'node:path';
import { Pool } from 'pg';

import {
  DEFAULT_BASE_URL,
  DEFAULT_TMP_ROOT,
  ensureRunDirs,
  getArgValue,
  makeRunId,
  postJson,
  sleep,
  writeJson,
} from './common.mjs';

const args = process.argv.slice(2);

const runId = getArgValue(args, '--run-id', makeRunId('tech-validate-dbpm'));
const runDir = path.resolve(
  getArgValue(args, '--run-dir', path.join(DEFAULT_TMP_ROOT, runId)),
);
const baseUrl = getArgValue(args, '--base-url', DEFAULT_BASE_URL);

const tenantCount = Number.parseInt(getArgValue(args, '--tenant-count', '2'), 10);
const userPassword = getArgValue(args, '--user-password', 'Constructive!23456');
const userPrefix = getArgValue(args, '--user-prefix', `dbpm-tech-${Date.now()}`);
const provisionDomain = getArgValue(args, '--provision-domain', 'localhost');
const modulesArg = getArgValue(args, '--provision-modules', 'all');
const targetSchemaName = getArgValue(args, '--target-schema-name', 'app_public');
const tablePrefix = getArgValue(args, '--table-prefix', 'items_dbpm');
const shapeVariantCount = Number.parseInt(
  getArgValue(args, '--shape-variants', '0'),
  10,
);

const provisionTimeoutMs = Number.parseInt(
  getArgValue(args, '--provision-timeout-ms', '180000'),
  10,
);
const provisionPollMs = Number.parseInt(getArgValue(args, '--provision-poll-ms', '2000'), 10);

const routeHost = getArgValue(args, '--route-host', 'localhost');
const privateApiName = getArgValue(args, '--private-api-name', 'private');
const privateDatabaseId = getArgValue(
  args,
  '--private-database-id',
  '028752cb-510b-1438-2f39-64534bd1cbd7',
);

const routeHeaders = {
  Host: routeHost,
  'X-Api-Name': privateApiName,
  'X-Database-Id': privateDatabaseId,
};

const modules = modulesArg
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (modules.length === 0) {
  throw new Error(`Invalid --provision-modules: ${modulesArg}`);
}

// ---------------------------------------------------------------------------
// Shape variant definitions (Option A — extra provisioned tables only)
// ---------------------------------------------------------------------------

/**
 * Each entry describes extra tables to provision for tenants assigned to
 * that variant group.  Group 0 always means "main table only" (no extras).
 *
 * The provisioning mutation is the same `createSecureTableProvision` used
 * for the main business table — this guarantees RLS, grants, policies,
 * and PostGraphile type generation are all exercised.
 */
const VARIANT_DEFS = [
  // Group 0: base case — no extra tables
  { tables: [] },
  // Group 1: extra table with 2 columns (tags)
  {
    tables: [
      {
        suffix: 'tags',
        fields: [
          { name: 'label', type: 'text' },
          { name: 'priority', type: 'integer' },
        ],
      },
    ],
  },
  // Group 2: extra table with 3 columns (metrics)
  {
    tables: [
      {
        suffix: 'metrics',
        fields: [
          { name: 'value', type: 'numeric' },
          { name: 'recorded_at', type: 'timestamptz' },
          { name: 'active', type: 'boolean' },
        ],
      },
    ],
  },
];

const effectiveVariantCount = Math.min(
  Math.max(shapeVariantCount, 0),
  VARIANT_DEFS.length,
);

const pgConfig = {
  host: getArgValue(args, '--pg-host', process.env.PGHOST || 'localhost'),
  port: Number.parseInt(getArgValue(args, '--pg-port', process.env.PGPORT || '5432'), 10),
  database: getArgValue(args, '--pg-database', process.env.PGDATABASE || 'constructive'),
  user: getArgValue(args, '--pg-user', process.env.PGUSER || 'postgres'),
  password: getArgValue(args, '--pg-password', process.env.PGPASSWORD || 'password'),
};

const signUpMutation = `
mutation SignUp($input: SignUpInput!) {
  signUp(input: $input) {
    result {
      id
      userId
      accessToken
    }
  }
}
`;

const signInMutation = `
mutation SignIn($input: SignInInput!) {
  signIn(input: $input) {
    result {
      id
      userId
      accessToken
    }
  }
}
`;

const createDatabaseProvisionModuleMutation = `
mutation CreateDatabaseProvisionModule($input: CreateDatabaseProvisionModuleInput!) {
  createDatabaseProvisionModule(input: $input) {
    databaseProvisionModule {
      id
      databaseName
      ownerId
      domain
      modules
      status
      errorMessage
      databaseId
      createdAt
      completedAt
    }
  }
}
`;

const createSecureTableProvisionMutation = `
mutation CreateSecureTableProvision($input: CreateSecureTableProvisionInput!) {
  createSecureTableProvision(input: $input) {
    secureTableProvision {
      id
      databaseId
      schemaId
      tableId
      tableName
      nodeType
      outFields
    }
  }
}
`;

const gql = async ({ query, variables, headers = {}, timeoutMs = 30000 }) => {
  return await postJson({
    url: `${baseUrl}/graphql`,
    headers: {
      ...routeHeaders,
      ...headers,
    },
    payload: { query, variables },
    timeoutMs,
  });
};

const firstError = (response) => response.json?.errors?.[0]?.message || response.error || 'unknown';

const signUpOrSignInUser = async ({ email, password }) => {
  const signUpRes = await gql({
    query: signUpMutation,
    variables: {
      input: {
        email,
        password,
        rememberMe: true,
      },
    },
  });

  const signUpResult = signUpRes.json?.data?.signUp?.result;
  if (signUpRes.ok && signUpResult?.accessToken && signUpResult?.userId) {
    return {
      mode: 'signUp',
      userId: signUpResult.userId,
      tokenId: signUpResult.id,
      accessToken: signUpResult.accessToken,
    };
  }

  const signInRes = await gql({
    query: signInMutation,
    variables: {
      input: {
        email,
        password,
        rememberMe: true,
      },
    },
  });

  const signInResult = signInRes.json?.data?.signIn?.result;
  if (signInRes.ok && signInResult?.accessToken && signInResult?.userId) {
    return {
      mode: 'signIn',
      userId: signInResult.userId,
      tokenId: signInResult.id,
      accessToken: signInResult.accessToken,
    };
  }

  throw new Error(
    `Auth failed for ${email}; signUpError=${firstError(signUpRes)}; signInError=${firstError(signInRes)}`,
  );
};

const createProvisionModule = async ({ token, ownerId, databaseName, subdomain }) => {
  const response = await gql({
    query: createDatabaseProvisionModuleMutation,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    variables: {
      input: {
        databaseProvisionModule: {
          databaseName,
          ownerId,
          domain: provisionDomain,
          subdomain,
          modules,
          options: {},
          bootstrapUser: true,
        },
      },
    },
    timeoutMs: provisionTimeoutMs,
  });

  const record = response.json?.data?.createDatabaseProvisionModule?.databaseProvisionModule;
  if (!response.ok || !record?.id) {
    throw new Error(
      `createDatabaseProvisionModule failed db=${databaseName}; status=${response.status}; error=${firstError(response)}`,
    );
  }

  return record;
};

const waitForProvisionCompletion = async ({ pool, moduleId }) => {
  const started = Date.now();

  while (Date.now() - started < provisionTimeoutMs) {
    const result = await pool.query(
      `
      select
        id::text,
        database_name,
        owner_id::text,
        status,
        error_message,
        database_id::text,
        modules::text,
        created_at,
        updated_at,
        completed_at
      from metaschema_modules_public.database_provision_module
      where id = $1::uuid
      `,
      [moduleId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error(`Provision module not found: ${moduleId}`);
    }

    if (row.status === 'failed') {
      throw new Error(
        `Provision failed moduleId=${moduleId}; error=${row.error_message || 'no error_message'}`,
      );
    }

    if (row.status === 'completed' && row.database_id) {
      return row;
    }

    await sleep(provisionPollMs);
  }

  throw new Error(`Provision timeout moduleId=${moduleId}; timeoutMs=${provisionTimeoutMs}`);
};

const findTargetSchema = async ({ pool, databaseId, targetName }) => {
  const exact = await pool.query(
    `
    select id::text, name, schema_name
    from metaschema_public.schema
    where database_id = $1::uuid
      and name = $2
    order by created_at desc
    limit 1
    `,
    [databaseId, targetName],
  );

  if (exact.rows[0]) {
    return exact.rows[0];
  }

  const fallback = await pool.query(
    `
    select id::text, name, schema_name
    from metaschema_public.schema
    where database_id = $1::uuid
      and name like 'app_%'
    order by created_at desc
    limit 1
    `,
    [databaseId],
  );

  if (fallback.rows[0]) {
    return fallback.rows[0];
  }

  throw new Error(`No app schema found for databaseId=${databaseId}`);
};

const createBusinessTable = async ({ token, databaseId, schemaId, tableName }) => {
  const response = await gql({
    query: createSecureTableProvisionMutation,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    variables: {
      input: {
        secureTableProvision: {
          databaseId,
          schemaId,
          tableName,
          nodeType: 'DataId',
          fields: [{ name: 'note', type: 'text' }],
        },
      },
    },
  });

  const record = response.json?.data?.createSecureTableProvision?.secureTableProvision;
  if (!response.ok || !record?.id) {
    throw new Error(
      `createSecureTableProvision failed db=${databaseId} schema=${schemaId}; status=${response.status}; error=${firstError(response)}`,
    );
  }

  return record;
};

/**
 * Provision a variant table via the same mutation used for the main
 * business table.  Failures are non-fatal — logged and recorded but
 * do not abort the tenant.
 */
const createVariantTable = async ({ token, databaseId, schemaId, tableName, fields }) => {
  const response = await gql({
    query: createSecureTableProvisionMutation,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    variables: {
      input: {
        secureTableProvision: {
          databaseId,
          schemaId,
          tableName,
          nodeType: 'DataId',
          fields,
        },
      },
    },
  });

  const record = response.json?.data?.createSecureTableProvision?.secureTableProvision;
  if (!response.ok || !record?.id) {
    return {
      ok: false,
      error: `createSecureTableProvision(variant) failed table=${tableName}; status=${response.status}; error=${firstError(response)}`,
    };
  }

  return { ok: true, record };
};

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

const validateSqlOps = async ({ pool, physicalSchema, tableName, tenantIndex }) => {
  const columnsResult = await pool.query(
    `
    select column_name, data_type
    from information_schema.columns
    where table_schema = $1
      and table_name = $2
    order by ordinal_position
    `,
    [physicalSchema, tableName],
  );

  const columns = columnsResult.rows;
  const hasId = columns.some((col) => col.column_name === 'id' && col.data_type === 'uuid');
  const hasNote = columns.some((col) => col.column_name === 'note' && col.data_type === 'text');
  if (!hasId || !hasNote) {
    throw new Error(
      `Unexpected columns ${physicalSchema}.${tableName}; expected id(uuid)+note(text), got=${JSON.stringify(columns)}`,
    );
  }

  const qualifiedTable = `${quoteIdent(physicalSchema)}.${quoteIdent(tableName)}`;

  const insert = await pool.query(
    `insert into ${qualifiedTable} (note) values ($1) returning id::text as id, note`,
    [`hello-from-dbpm-tenant-${tenantIndex}`],
  );
  const inserted = insert.rows[0];

  const select = await pool.query(
    `select count(*)::int as c from ${qualifiedTable} where id = $1::uuid`,
    [inserted.id],
  );

  const update = await pool.query(
    `update ${qualifiedTable} set note = $2 where id = $1::uuid returning id::text as id, note`,
    [inserted.id, `updated-dbpm-tenant-${tenantIndex}`],
  );

  return {
    columns,
    insertRow: inserted,
    selectCount: select.rows[0]?.c ?? 0,
    updateRow: update.rows[0] || null,
  };
};

const listDatabaseSchemas = async ({ pool, databaseId }) => {
  const result = await pool.query(
    `
    select name, schema_name
    from metaschema_public.schema
    where database_id = $1::uuid
    order by name
    `,
    [databaseId],
  );
  return result.rows.map((row) => ({
    name: row.name,
    schemaName: row.schema_name,
  }));
};

const main = async () => {
  if (!Number.isFinite(tenantCount) || tenantCount < 2) {
    throw new Error(`--tenant-count must be >= 2, got: ${tenantCount}`);
  }

  const dirs = await ensureRunDirs(runDir);
  const pool = new Pool(pgConfig);

  const accounts = [];
  const failures = [];

  try {
    for (let i = 1; i <= tenantCount; i += 1) {
      const idx = String(i).padStart(2, '0');
      const suffix = `${Date.now().toString().slice(-6)}-${i}`;
      const email = `${userPrefix}-${idx}@example.com`;
      const databaseName = `perf_dbpm_${suffix.replace(/-/g, '_')}`;
      const subdomain = `dbpm-${suffix}`;
      const tableName = `${tablePrefix}_${suffix.replace(/-/g, '_')}`;

      try {
        const auth = await signUpOrSignInUser({ email, password: userPassword });
        const provision = await createProvisionModule({
          token: auth.accessToken,
          ownerId: auth.userId,
          databaseName,
          subdomain,
        });

        const provisionFinal = await waitForProvisionCompletion({
          pool,
          moduleId: provision.id,
        });

        const schema = await findTargetSchema({
          pool,
          databaseId: provisionFinal.database_id,
          targetName: targetSchemaName,
        });

        const secureTable = await createBusinessTable({
          token: auth.accessToken,
          databaseId: provisionFinal.database_id,
          schemaId: schema.id,
          tableName,
        });

        // --- Option A: shape variant tables ---
        const variantResults = [];
        const variantIndex = effectiveVariantCount > 0
          ? (i - 1) % effectiveVariantCount
          : 0;
        const variantDef = effectiveVariantCount > 0
          ? VARIANT_DEFS[variantIndex]
          : VARIANT_DEFS[0];

        for (const vtDef of variantDef.tables) {
          const vtName = `${tablePrefix}_variant_${vtDef.suffix}_${suffix.replace(/-/g, '_')}`;
          console.log(`  [tenant ${i}] provisioning variant table: ${vtName} (group ${variantIndex}, fields=${vtDef.fields.length})`);
          const vtResult = await createVariantTable({
            token: auth.accessToken,
            databaseId: provisionFinal.database_id,
            schemaId: schema.id,
            tableName: vtName,
            fields: vtDef.fields,
          });
          if (vtResult.ok) {
            variantResults.push({
              tableName: vtResult.record.tableName || vtName,
              tableId: vtResult.record.tableId,
              fields: vtDef.fields,
              suffix: vtDef.suffix,
            });
          } else {
            console.warn(`  [tenant ${i}] variant table failed: ${vtResult.error}`);
            variantResults.push({
              tableName: vtName,
              fields: vtDef.fields,
              suffix: vtDef.suffix,
              error: vtResult.error,
            });
          }
        }

        const databaseSchemas = await listDatabaseSchemas({
          pool,
          databaseId: provisionFinal.database_id,
        });

        const sqlValidation = await validateSqlOps({
          pool,
          physicalSchema: schema.schema_name,
          tableName: secureTable.tableName || tableName,
          tenantIndex: i,
        });

        accounts.push({
          tenantKey: `user:${auth.userId}`,
          email,
          authMode: auth.mode,
          authUserId: auth.userId,
          shapeVariant: {
            index: variantIndex,
            tables: variantResults,
          },
          created: {
            databaseProvisionModule: {
              id: provision.id,
              databaseName: provision.databaseName,
              ownerId: provision.ownerId,
              domain: provision.domain,
              modules: provision.modules,
              status: provision.status,
              databaseId: provision.databaseId,
              createdAt: provision.createdAt,
              completedAt: provision.completedAt,
            },
            provisionFinal: {
              status: provisionFinal.status,
              databaseId: provisionFinal.database_id,
              modules: provisionFinal.modules,
              completedAt: provisionFinal.completed_at,
            },
            schema: {
              id: schema.id,
              name: schema.name,
              schemaName: schema.schema_name,
              availableSchemas: databaseSchemas,
            },
            secureTableProvision: {
              id: secureTable.id,
              databaseId: secureTable.databaseId,
              schemaId: secureTable.schemaId,
              tableId: secureTable.tableId,
              tableName: secureTable.tableName,
              nodeType: secureTable.nodeType,
              outFields: secureTable.outFields,
            },
          },
          sqlValidation: {
            physicalSchema: schema.schema_name,
            physicalTable: `${schema.schema_name}.${secureTable.tableName || tableName}`,
            ...sqlValidation,
          },
        });
      } catch (error) {
        failures.push({
          tenantIndex: i,
          email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await pool.end();
  }

  // --- Shape variant success/failure accounting ---
  let variantTablesExpected = 0;
  let variantTablesSucceeded = 0;
  let variantTablesFailed = 0;
  let tenantsWithVariantFailures = 0;

  for (const account of accounts) {
    const sv = account.shapeVariant;
    // Only count tenants that were supposed to get extra tables (group > 0)
    const expectedForTenant = sv.tables.length;
    if (expectedForTenant === 0 && sv.index === 0) {
      // Group 0 = no extras expected — not a failure
      continue;
    }
    const failedForTenant = sv.tables.filter((t) => t.error).length;
    variantTablesExpected += expectedForTenant;
    variantTablesSucceeded += expectedForTenant - failedForTenant;
    variantTablesFailed += failedForTenant;
    if (failedForTenant > 0) {
      tenantsWithVariantFailures += 1;
    }
  }

  const variantsRequested = effectiveVariantCount > 0;
  const variantsPassed = !variantsRequested || variantTablesFailed === 0;

  const summary = {
    requestedTenants: tenantCount,
    successTenants: accounts.length,
    failedTenants: failures.length,
    passed: accounts.length >= 2 && failures.length === 0 && variantsPassed,
    ...(variantsRequested
      ? {
          shapeVariants: {
            requested: true,
            variantGroupCount: effectiveVariantCount,
            variantTablesExpected,
            variantTablesSucceeded,
            variantTablesFailed,
            tenantsWithVariantFailures,
            passed: variantsPassed,
          },
        }
      : {}),
  };

  if (variantsRequested && !variantsPassed) {
    console.error(
      `\n⚠ Shape variant provisioning incomplete: ${variantTablesFailed}/${variantTablesExpected} expected variant tables failed across ${tenantsWithVariantFailures} tenant(s).\n` +
        `  The run is marked as FAILED because --shape-variants ${shapeVariantCount} was requested but structural divergence was not fully achieved.\n`,
    );
  }

  const report = {
    createdAt: new Date().toISOString(),
    baseUrl,
    routeHeaders,
    flow: 'signUp/signIn -> createDatabaseProvisionModule(modules=all) -> use app_public -> createSecureTableProvision(DataId+note) -> SQL insert/select/update by id',
    options: {
      tenantCount,
      modules,
      provisionDomain,
      targetSchemaName,
      tablePrefix,
      provisionTimeoutMs,
      provisionPollMs,
      shapeVariantCount: effectiveVariantCount,
    },
    summary,
    accounts,
    failures,
  };

  const manifest = accounts.map((account) => ({
    tenantKey: account.tenantKey,
    email: account.email,
    databaseId: account.created.provisionFinal.databaseId,
    schemaId: account.created.schema.id,
    schemaName: account.created.schema.name,
    physicalSchema: account.created.schema.schemaName,
    availableSchemas: account.created.schema.availableSchemas,
    tableId: account.created.secureTableProvision.tableId,
    tableName: account.created.secureTableProvision.tableName,
    seedRowId: account.sqlValidation.insertRow?.id ?? null,
    variantIndex: account.shapeVariant.index,
    variantTables: account.shapeVariant.tables,
  }));

  const credentials = accounts.map((account) => ({
    tenantKey: account.tenantKey,
    email: account.email,
    password: userPassword,
    host: routeHost,
    apiName: privateApiName,
    databaseId: account.created.provisionFinal.databaseId,
    provisionedDatabaseId: account.created.provisionFinal.databaseId,
  }));

  const reportPath = path.join(dirs.reportsDir, 'db-tech-validation.json');
  const manifestPath = path.join(dirs.dataDir, 'business-table-manifest.json');
  const credentialsPath = path.join(dirs.dataDir, 'tenant-credentials.json');

  await writeJson(reportPath, report);
  await writeJson(manifestPath, manifest);
  await writeJson(credentialsPath, credentials);

  console.log(
    JSON.stringify(
      {
        runDir,
        reportPath,
        manifestPath,
        credentialsPath,
        summary,
      },
      null,
      2,
    ),
  );

  if (!summary.passed) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
