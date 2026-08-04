'use strict';

const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const {
  FIXTURE_DIR,
  FIXTURE_ID,
  atomicWriteJson,
  makeCustomers,
} = require('./lib.cjs');
const {
  TENANTS,
  parseArgs,
  parsePositiveInteger,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');

const DEFAULT_CANONICAL_SCHEMAS = Object.freeze([
  // These shared schemas are visible to every build through type/function
  // dependencies, so a tenant-only fingerprint would be insufficient proof
  // that two physical databases are blueprint-compatible.
  'ctf_extensions',
  'ctf_a',
  'ctf_a_realtime',
  'ctf_b',
  'ctf_b_realtime',
  'ctf_c',
  'ctf_c_realtime',
  'jwt_private',
]);
const REQUIRED_EXTENSIONS = Object.freeze([
  'ltree',
  'pg_textsearch',
  'pg_trgm',
  'postgis',
  'vector',
]);
const RUN_PURPOSES = Object.freeze(['hostile-preflight', 'measurement']);
const CLONE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const ATTESTATION_NONCE_PATTERN = /^[a-f0-9]{64}$/;

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const requireCloneId = (value) => {
  if (typeof value !== 'string' || !CLONE_ID_PATTERN.test(value)) {
    throw new Error('PDCF_CLONE_ID_INVALID');
  }
  return value;
};

const requireRunPurpose = (value) => {
  if (!RUN_PURPOSES.includes(value)) throw new Error('PDCF_RUN_PURPOSE_INVALID');
  return value;
};

const provisionAttestationSha256 = ({
  cloneId,
  runPurpose,
  customerId,
  database,
  nonce,
}) => {
  requireCloneId(cloneId);
  requireRunPurpose(runPurpose);
  if (typeof customerId !== 'string' || !customerId) {
    throw new Error('PDCF_ATTESTATION_CUSTOMER_ID_INVALID');
  }
  if (typeof database !== 'string' || !database) {
    throw new Error('PDCF_ATTESTATION_DATABASE_INVALID');
  }
  if (typeof nonce !== 'string' || !ATTESTATION_NONCE_PATTERN.test(nonce)) {
    throw new Error('PDCF_ATTESTATION_NONCE_INVALID');
  }
  const digest = crypto.createHash('sha256');
  for (const value of [
    'physical-database-density-provision-attestation-v1',
    cloneId,
    runPurpose,
    customerId,
    database,
    nonce,
  ]) {
    digest.update(value);
    digest.update('\0');
  }
  return `sha256:${digest.digest('hex')}`;
};

const provisionAttestationSetSha256 = (customers) => sha256Json(
  [...customers].map((customer) => ({
    customerId: customer.id,
    database: customer.database,
    sha256: customer.provisionAttestation.sha256,
  })).sort((left, right) => left.customerId.localeCompare(right.customerId)),
);

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? FIXTURE_DIR,
    env: options.env ?? process.env,
    encoding: 'utf8',
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || result.error?.message;
    throw new Error(`PDCF_COMMAND_FAILED:${command}:${detail || `exit=${result.status}`}`);
  }
  return result.stdout ?? '';
};

const psql = (database, sql, environment = process.env) => run(
  'psql',
  ['--no-psqlrc', '--set=ON_ERROR_STOP=1', '--dbname', database],
  { input: `${sql}\n`, env: environment },
);

const applySqlFile = (database, file, roles, environment = process.env) => run(
  'psql',
  [
    '--no-psqlrc',
    '--set=ON_ERROR_STOP=1',
    '--dbname', database,
    '--set', `runtime_role_a=${roles.a}`,
    '--set', `runtime_role_b=${roles.b}`,
    '--set', `runtime_role_c=${roles.c}`,
    '--file', file,
  ],
  { env: environment },
);

const applyProvisionAttestation = (
  database,
  file,
  { cloneId, runPurpose, customerId, nonce, sha256 },
  environment = process.env,
) => run(
  'psql',
  [
    '--no-psqlrc',
    '--set=ON_ERROR_STOP=1',
    '--dbname', database,
    '--set', `clone_id=${cloneId}`,
    '--set', `run_purpose=${runPurpose}`,
    '--set', `customer_id=${customerId}`,
    '--set', `attestation_nonce=${nonce}`,
    '--set', `attestation_sha256=${sha256}`,
    '--file', file,
  ],
  { env: environment },
);

const normalizeSchemaDump = (dump, roleAliases = {}) => {
  const normalizedRoles = Object.entries(roleAliases)
    .sort(([left], [right]) => right.length - left.length);
  const normalizeRoles = (line) => normalizedRoles.reduce((value, [role, alias]) => {
    const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return value.replace(
      new RegExp(`(^|[^a-zA-Z0-9_])${escaped}(?=$|[^a-zA-Z0-9_])`, 'g'),
      `$1${alias}`,
    );
  }, line);
  return `${dump
    .split(/\r?\n/)
    .filter((line) => !(
      line.startsWith('\\restrict ')
      || line.startsWith('\\unrestrict ')
      || line.startsWith('-- Dumped from database version')
      || line.startsWith('-- Dumped by pg_dump version')
      || line.startsWith('-- Started on ')
      || line.startsWith('-- Completed on ')
    ))
    .map(normalizeRoles)
    .join('\n')
    .trim()}\n`;
};

const fingerprintDump = (
  database,
  schemas,
  environment = process.env,
  roleAliases = {},
) => {
  const args = [
    '--schema-only',
    '--no-owner',
    '--dbname', database,
    ...schemas.flatMap((schema) => ['--schema', schema]),
  ];
  // ACLs are part of Graphile's effective catalog. Preserve them in the dump,
  // but replace per-customer login names with stable tenant slots so equivalent
  // least-privilege grants compare byte-for-byte across physical databases.
  const normalized = normalizeSchemaDump(
    run('pg_dump', args, { env: environment }),
    roleAliases,
  );
  return {
    sha256: `sha256:${crypto.createHash('sha256').update(normalized).digest('hex')}`,
    bytes: Buffer.byteLength(normalized),
  };
};

const structuralFingerprints = (database, schemas, roles, environment) => {
  const roleAliases = Object.fromEntries(TENANTS.map((tenant) => [
    roles[tenant.id],
    `__runtime_${tenant.id}__`,
  ]));
  return {
    combined: fingerprintDump(database, schemas, environment, roleAliases),
    schemas: Object.fromEntries(schemas.map((schema) => [
      schema,
      fingerprintDump(database, [schema], environment, roleAliases),
    ])),
  };
};

const parseJsonRows = (stdout, label) => {
  const value = stdout.trim();
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    throw new Error(`PDCF_${label}_JSON_INVALID`);
  }
};

const sha256Json = (value) => `sha256:${crypto.createHash('sha256')
  .update(JSON.stringify(value))
  .digest('hex')}`;

const normalizedRoleSafetyProfile = (roles, roleAudit) => TENANTS.map((tenant) => {
  const roleName = roles[tenant.id];
  const row = roleAudit.find((candidate) => candidate.role_name === roleName);
  if (!row) throw new Error(`PDCF_ROLE_AUDIT_PROFILE_INCOMPLETE:${tenant.id}`);
  const { role_name: _roleName, ...flags } = row;
  return { slot: tenant.id, ...flags };
});

const inspectCustomerContract = ({
  customer,
  canonicalSchemas,
  environment = process.env,
}) => {
  const roleAudit = auditRuntimeRoles(customer.database, customer.roles, environment);
  const roleSafetyProfile = normalizedRoleSafetyProfile(customer.roles, roleAudit);
  const notificationRoleAudit = auditNotificationRole(
    customer.database,
    customer.notificationRole,
    environment,
  );
  const {
    role_name: _notificationRoleName,
    ...notificationRoleSafetyProfile
  } = notificationRoleAudit;
  const extensionVersions = auditExtensionVersions(customer.database, environment);
  const fingerprints = structuralFingerprints(
    customer.database,
    canonicalSchemas,
    customer.roles,
    environment,
  );
  const databaseContractFingerprint = sha256Json({
    structuralFingerprints: fingerprints,
    extensionVersions,
    roleSafetyProfile,
    notificationRoleSafetyProfile,
  });
  return {
    roleAudit,
    roleSafetyProfile,
    notificationRoleAudit,
    notificationRoleSafetyProfile,
    extensionVersions,
    structuralFingerprints: fingerprints,
    databaseContractFingerprint,
  };
};

const auditNotificationRole = (database, role, environment) => {
  const sql = `
COPY (
  SELECT row_to_json(audit)
  FROM (
    SELECT r.rolname AS role_name,
           r.rolcanlogin AS can_login,
           NOT r.rolinherit AS noinherit,
           NOT r.rolsuper AS not_superuser,
           NOT r.rolbypassrls AS no_bypassrls,
           NOT r.rolcreaterole AS no_createrole,
           NOT r.rolcreatedb AS no_createdb,
           NOT r.rolreplication AS no_replication,
           NOT EXISTS (
             SELECT 1 FROM pg_catalog.pg_auth_members membership
             WHERE membership.member = r.oid OR membership.roleid = r.oid
           ) AS no_membership,
           pg_catalog.has_database_privilege(r.rolname, ${quoteLiteral(database)}, 'CONNECT')
             AS target_connect,
           NOT EXISTS (
             SELECT 1 FROM pg_catalog.pg_database d
             WHERE d.datname <> ${quoteLiteral(database)}
               AND pg_catalog.has_database_privilege(r.rolname, d.oid, 'CONNECT')
           ) AS no_cross_database_connect,
           NOT EXISTS (
             SELECT 1 FROM pg_catalog.pg_database d
             WHERE d.datname = ${quoteLiteral(database)}
               AND d.datdba = r.oid
           ) AS not_database_owner,
           NOT pg_catalog.has_database_privilege(
             r.rolname, ${quoteLiteral(database)}, 'CREATE'
           ) AS no_database_create,
           NOT pg_catalog.has_database_privilege(
             r.rolname, ${quoteLiteral(database)}, 'TEMP'
           ) AS no_database_temp,
           NOT EXISTS (
             SELECT 1 FROM pg_catalog.pg_namespace n
             WHERE n.nspname <> 'information_schema'
               AND n.nspname !~ '^pg_'
               AND (
                 n.nspowner = r.oid
                 OR pg_catalog.has_schema_privilege(r.rolname, n.oid, 'CREATE')
                 OR pg_catalog.has_schema_privilege(r.rolname, n.oid, 'USAGE')
               )
           ) AS no_application_schema_access,
           NOT EXISTS (
             SELECT 1
             FROM pg_catalog.pg_class c
             JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname <> 'information_schema'
               AND n.nspname !~ '^pg_'
               AND (
                 CASE WHEN c.relkind IN ('r', 'p', 'v', 'm', 'f') THEN
                   pg_catalog.has_table_privilege(
                     r.rolname, c.oid,
                     'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
                   )
                   OR pg_catalog.has_any_column_privilege(
                     r.rolname, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'
                   )
                 WHEN c.relkind = 'S' THEN
                   pg_catalog.has_sequence_privilege(
                     r.rolname, c.oid, 'USAGE,SELECT,UPDATE'
                   )
                 ELSE false END
               )
           ) AS no_application_relation_access,
           NOT EXISTS (
             SELECT 1
             FROM pg_catalog.pg_proc p
             JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname <> 'information_schema'
               AND n.nspname !~ '^pg_'
               AND pg_catalog.has_function_privilege(r.rolname, p.oid, 'EXECUTE')
           ) AS no_application_function_access
    FROM pg_catalog.pg_roles r
    WHERE r.rolname = ${quoteLiteral(role)}
  ) audit
) TO STDOUT;
`;
  const row = parseJsonRows(psql(database, sql, environment), 'NOTIFICATION_ROLE_AUDIT');
  const required = [
    'can_login',
    'noinherit',
    'not_superuser',
    'no_bypassrls',
    'no_createrole',
    'no_createdb',
    'no_replication',
    'no_membership',
    'target_connect',
    'no_cross_database_connect',
    'not_database_owner',
    'no_database_create',
    'no_database_temp',
    'no_application_schema_access',
    'no_application_relation_access',
    'no_application_function_access',
  ];
  if (
    !row
    || Array.isArray(row)
    || row.role_name !== role
    || required.some((field) => row[field] !== true)
  ) {
    throw new Error(`PDCF_NOTIFICATION_ROLE_AUDIT_FAILED:${database}:${role}`);
  }
  return row;
};

const auditExtensionVersions = (database, environment) => {
  const sql = `
COPY (
  SELECT COALESCE(
    pg_catalog.json_agg(row_to_json(extension_row) ORDER BY extension_row.name),
    '[]'::json
  )
  FROM (
    SELECT e.extname AS name,
           e.extversion AS version,
           n.nspname AS schema
    FROM pg_catalog.pg_extension e
    JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = ANY(ARRAY[${REQUIRED_EXTENSIONS.map(quoteLiteral).join(', ')}]::text[])
  ) extension_row
) TO STDOUT;
`;
  const rows = parseJsonRows(psql(database, sql, environment), 'EXTENSION_AUDIT');
  if (
    !Array.isArray(rows)
    || rows.length !== REQUIRED_EXTENSIONS.length
    || rows.some((row, index) =>
      row.name !== REQUIRED_EXTENSIONS[index]
      || typeof row.version !== 'string'
      || row.version.length === 0
      || row.schema !== 'ctf_extensions'
    )
  ) {
    throw new Error(`PDCF_EXTENSION_AUDIT_FAILED:${database}`);
  }
  return rows;
};

const auditRuntimeRoles = (database, roles, environment) => {
  const names = Object.values(roles);
  const sql = `
COPY (
  SELECT pg_catalog.json_agg(row_to_json(audit) ORDER BY audit.role_name)
  FROM (
    SELECT r.rolname AS role_name,
           r.rolcanlogin AS can_login,
           NOT r.rolinherit AS noinherit,
           NOT r.rolsuper AS not_superuser,
           NOT r.rolbypassrls AS no_bypassrls,
           NOT r.rolcreaterole AS no_createrole,
           NOT r.rolcreatedb AS no_createdb,
           NOT r.rolreplication AS no_replication,
           NOT pg_catalog.has_database_privilege(r.rolname, current_database(), 'CREATE') AS no_database_create,
           NOT pg_catalog.has_schema_privilege(
             r.rolname,
             'ctf_provision_private',
             'USAGE'
           ) AS no_provision_attestation_schema_usage,
           NOT (
             pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'SELECT'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'INSERT'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'UPDATE'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'DELETE'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'TRUNCATE'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'REFERENCES'
             )
             OR pg_catalog.has_table_privilege(
               r.rolname,
               'ctf_provision_private.clone_attestation',
               'TRIGGER'
             )
           ) AS no_provision_attestation_table_privileges,
           NOT EXISTS (
             SELECT 1
             FROM pg_catalog.pg_namespace n
             WHERE n.nspname <> 'information_schema'
               AND n.nspname !~ '^pg_'
               AND (
                 n.nspowner = r.oid
                 OR pg_catalog.has_schema_privilege(r.rolname, n.oid, 'CREATE')
               )
           ) AS no_schema_owner_or_create
    FROM pg_catalog.pg_roles r
    WHERE r.rolname = ANY(ARRAY[${names.map(quoteLiteral).join(', ')}]::text[])
  ) audit
) TO STDOUT;
`;
  const rows = parseJsonRows(psql(database, sql, environment), 'ROLE_AUDIT');
  if (!Array.isArray(rows) || rows.length !== names.length) {
    throw new Error(`PDCF_ROLE_AUDIT_INCOMPLETE:${database}`);
  }
  const required = [
    'can_login',
    'noinherit',
    'not_superuser',
    'no_bypassrls',
    'no_createrole',
    'no_createdb',
    'no_replication',
    'no_database_create',
    'no_provision_attestation_schema_usage',
    'no_provision_attestation_table_privileges',
    'no_schema_owner_or_create',
  ];
  for (const row of rows) {
    if (required.some((field) => row[field] !== true)) {
      throw new Error(`PDCF_ROLE_AUDIT_FAILED:${database}:${row.role_name}`);
    }
  }
  return rows;
};

const provisionCustomer = ({
  customer,
  passwords,
  maintenanceDatabase,
  schemaFile,
  identityFile,
  attestationFile,
  provisionAttestation,
  recreate,
  environment,
  canonicalSchemas,
}) => {
  if (recreate) {
    psql(maintenanceDatabase, `
SELECT pg_catalog.pg_terminate_backend(pid)
FROM pg_catalog.pg_stat_activity
WHERE datname = ${quoteLiteral(customer.database)}
  AND pid <> pg_catalog.pg_backend_pid();
DROP DATABASE IF EXISTS ${quoteIdentifier(customer.database)};
${Object.values(customer.roles).map((role) =>
    `DROP ROLE IF EXISTS ${quoteIdentifier(role)};`
  ).join('\n')}
DROP ROLE IF EXISTS ${quoteIdentifier(customer.notificationRole)};
`, environment);
  }

  psql(maintenanceDatabase, Object.entries(customer.roles).map(([tenantId, role]) => `
CREATE ROLE ${quoteIdentifier(role)}
  LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${quoteLiteral(passwords[role])};
COMMENT ON ROLE ${quoteIdentifier(role)} IS ${quoteLiteral(`${FIXTURE_ID}:${customer.id}:${tenantId}`)};
`).join('\n') + `
CREATE ROLE ${quoteIdentifier(customer.notificationRole)}
  LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${quoteLiteral(passwords[customer.notificationRole])};
COMMENT ON ROLE ${quoteIdentifier(customer.notificationRole)} IS ${quoteLiteral(
    `${FIXTURE_ID}:${customer.id}:notification-only`
  )};
`, environment);

  psql(maintenanceDatabase, `
CREATE DATABASE ${quoteIdentifier(customer.database)};
REVOKE ALL ON DATABASE ${quoteIdentifier(customer.database)} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${quoteIdentifier(customer.database)} TO ${[
    ...Object.values(customer.roles),
    customer.notificationRole,
  ]
    .map(quoteIdentifier)
    .join(', ')};
COMMENT ON DATABASE ${quoteIdentifier(customer.database)} IS ${quoteLiteral(`${FIXTURE_ID}:${customer.id}`)};
`, environment);

  applySqlFile(customer.database, schemaFile, customer.roles, environment);
  applySqlFile(customer.database, identityFile, customer.roles, environment);
  applyProvisionAttestation(
    customer.database,
    attestationFile,
    provisionAttestation,
    environment,
  );

  const contract = inspectCustomerContract({
    customer,
    canonicalSchemas,
    environment,
  });
  return {
    ...customer,
    provisionAttestation: {
      version: 1,
      cloneId: provisionAttestation.cloneId,
      purpose: provisionAttestation.runPurpose,
      sha256: provisionAttestation.sha256,
    },
    ...contract,
  };
};

const provision = ({
  prefix,
  customerCount,
  outDir,
  maintenanceDatabase,
  schemaFile,
  identityFile,
  attestationFile,
  cloneId,
  runPurpose,
  recreate,
  environment = process.env,
  canonicalSchemas = DEFAULT_CANONICAL_SCHEMAS,
  credentialTemplate = null,
}) => {
  cloneId = requireCloneId(cloneId);
  runPurpose = requireRunPurpose(runPurpose);
  const customers = makeCustomers(prefix, customerCount);
  const requiredRuntimeRoles = customers.flatMap((customer) =>
    Object.values(customer.roles)
  ).sort();
  const requiredNotificationRoles = customers.map((customer) =>
    customer.notificationRole
  ).sort();
  const assertExactPasswords = (value, roles, label) => {
    if (
      !value
      || typeof value !== 'object'
      || Array.isArray(value)
      || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(roles)
      || roles.some((role) =>
        typeof value[role] !== 'string' || Buffer.byteLength(value[role]) < 24
      )
    ) {
      throw new Error(`PDCF_${label}_CREDENTIAL_TEMPLATE_INVALID`);
    }
    return Object.fromEntries(roles.map((role) => [role, value[role]]));
  };
  const runtimePasswords = credentialTemplate
    ? assertExactPasswords(
      credentialTemplate.runtimePasswords,
      requiredRuntimeRoles,
      'RUNTIME',
    )
    : Object.fromEntries(requiredRuntimeRoles.map((role) => [
      role,
      crypto.randomBytes(32).toString('base64url'),
    ]));
  const notificationPasswords = credentialTemplate
    ? assertExactPasswords(
      credentialTemplate.notificationPasswords,
      requiredNotificationRoles,
      'NOTIFICATION',
    )
    : Object.fromEntries(requiredNotificationRoles.map((role) => [
      role,
      crypto.randomBytes(32).toString('base64url'),
    ]));
  const allPasswords = { ...runtimePasswords, ...notificationPasswords };

  // The notification-role contract rejects CONNECT to every other database.
  // This fixture owns a disposable PostgreSQL cluster, so remove PostgreSQL's
  // default PUBLIC grants before any per-customer role is audited.
  psql(maintenanceDatabase, `
DO $revoke_public_connect$
DECLARE
  database_record record;
BEGIN
  FOR database_record IN SELECT datname FROM pg_catalog.pg_database
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE CONNECT ON DATABASE %I FROM PUBLIC',
      database_record.datname
    );
  END LOOP;
END
$revoke_public_connect$;
`, environment);
  const provisioned = customers.map((customer) => {
    const nonce = crypto.randomBytes(32).toString('hex');
    const provisionAttestation = {
      cloneId,
      runPurpose,
      customerId: customer.id,
      nonce,
      sha256: provisionAttestationSha256({
        cloneId,
        runPurpose,
        customerId: customer.id,
        database: customer.database,
        nonce,
      }),
    };
    return provisionCustomer({
      customer,
      passwords: allPasswords,
      maintenanceDatabase,
      schemaFile,
      identityFile,
      attestationFile,
      provisionAttestation,
      recreate,
      environment,
      canonicalSchemas,
    });
  });
  const expected = provisioned[0].structuralFingerprints;
  const expectedDatabaseContractFingerprint = provisioned[0].databaseContractFingerprint;
  for (const customer of provisioned.slice(1)) {
    if (customer.databaseContractFingerprint !== expectedDatabaseContractFingerprint) {
      throw new Error(
        `PDCF_DATABASE_CONTRACT_MISMATCH:${provisioned[0].database}:${customer.database}`
      );
    }
    if (customer.structuralFingerprints.combined.sha256 !== expected.combined.sha256) {
      throw new Error(
        `PDCF_CANONICAL_SCHEMA_MISMATCH:${provisioned[0].database}:${customer.database}`
      );
    }
    for (const schema of canonicalSchemas) {
      if (
        customer.structuralFingerprints.schemas[schema].sha256
        !== expected.schemas[schema].sha256
      ) {
        throw new Error(`PDCF_CANONICAL_SCHEMA_MISMATCH:${schema}:${customer.database}`);
      }
    }
  }
  const manifest = {
    version: 1,
    fixture: FIXTURE_ID,
    prefix,
    createdAt: new Date().toISOString(),
    provisionClone: {
      version: 1,
      id: cloneId,
      purpose: runPurpose,
      attestationSetSha256: provisionAttestationSetSha256(provisioned),
    },
    canonicalSchemas,
    canonicalStructuralFingerprint: expected,
    canonicalDatabaseContractFingerprint: expectedDatabaseContractFingerprint,
    pgDumpVersion: run('pg_dump', ['--version'], { env: environment }).trim(),
    customers: provisioned,
  };
  const secrets = {
    version: 1,
    fixture: FIXTURE_ID,
    runtimePasswords,
    notificationPasswords,
  };
  const manifestFile = path.join(outDir, 'provision.json');
  const secretsFile = path.join(outDir, 'runtime-secrets.json');
  atomicWriteJson(manifestFile, manifest);
  atomicWriteJson(secretsFile, secrets, 0o600);
  return { manifest, manifestFile, secretsFile };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const recreate = args.recreate === true;
  if (recreate && args.yes !== true) throw new Error('PDCF_RECREATE_REQUIRES_YES');
  const prefix = requireString(args, 'prefix', 'pdc_density');
  const customerCount = parsePositiveInteger(args.customers ?? '3', 'customers');
  const outDir = path.resolve(requireString(
    args,
    'out-dir',
    path.join(FIXTURE_DIR, '.local'),
  ));
  const maintenanceDatabase = requireString(
    args,
    'maintenance-database',
    process.env.PGDATABASE ?? 'postgres',
  );
  const schemaFile = path.resolve(requireString(
    args,
    'schema-file',
    path.join(FIXTURE_DIR, '../complete-tenant-fixture/schema.sql'),
  ));
  const identityFile = path.resolve(requireString(
    args,
    'identity-file',
    path.join(FIXTURE_DIR, 'physical-identity.sql'),
  ));
  const attestationFile = path.resolve(requireString(
    args,
    'attestation-file',
    path.join(FIXTURE_DIR, 'provision-attestation.sql'),
  ));
  const result = provision({
    prefix,
    customerCount,
    outDir,
    maintenanceDatabase,
    schemaFile,
    identityFile,
    attestationFile,
    cloneId: requireString(args, 'clone-id'),
    runPurpose: requireString(args, 'run-purpose'),
    recreate,
  });
  process.stdout.write(`${JSON.stringify({
    status: 'provisioned',
    customers: result.manifest.customers.length,
    canonicalStructuralFingerprint:
      result.manifest.canonicalStructuralFingerprint.combined.sha256,
    provisionClone: result.manifest.provisionClone,
    manifestFile: result.manifestFile,
    secretsFile: result.secretsFile,
  })}\n`);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_CANONICAL_SCHEMAS,
  REQUIRED_EXTENSIONS,
  auditExtensionVersions,
  auditNotificationRole,
  auditRuntimeRoles,
  fingerprintDump,
  inspectCustomerContract,
  normalizeSchemaDump,
  normalizedRoleSafetyProfile,
  provision,
  provisionAttestationSetSha256,
  provisionAttestationSha256,
  requireCloneId,
  requireRunPurpose,
  structuralFingerprints,
};
