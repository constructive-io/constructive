'use strict';

const { spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  REPO_ROOT,
  TENANTS,
  assertCredentialFree,
  parseArgs,
  requireString,
} = require('../complete-tenant-fixture/lib.cjs');
const completeServer = require('../complete-tenant-fixture/server.cjs');
const {
  FIXTURE_ID,
  validateProvisionManifest,
  validateSecrets,
} = require('./lib.cjs');

const PROBE_KIND = 'unsafe-runtime-fixture-startup-admission-v2';
const PROBE_VERSION = 2;
const ADMISSION_SCOPE = 'complete-tenant-fixture:createFixtureServer-pre-build-role-audit-v1';
const CLONE_AUDIT_KIND = 'unsafe-runtime-live-clone-audit-v1';
const ROLE_AUDIT_KIND = 'unsafe-runtime-role-profile-audit-v1';
const CLEANUP_AUDIT_KIND = 'unsafe-runtime-role-cleanup-audit-v1';
const SAFE_CONTROL_CAPABILITY = 'safe-control';
const PROBE_CAPABILITIES = Object.freeze([
  'superuser',
  'bypassrls',
  'createrole',
  'schema-owner',
  'schema-create',
]);
const PROBE_ROLE_PATTERNS = Object.freeze({
  superuser: /^ctf_unsafe_super_[a-f0-9]{12}$/,
  bypassrls: /^ctf_unsafe_bypass_[a-f0-9]{12}$/,
  createrole: /^ctf_unsafe_create_role_[a-f0-9]{12}$/,
  'schema-owner': /^ctf_unsafe_schema_owner_[a-f0-9]{12}$/,
  'schema-create': /^ctf_unsafe_schema_create_[a-f0-9]{12}$/,
});
const SAFE_LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;

const exactKeys = (value, expected) =>
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort())
    === JSON.stringify([...expected].sort());

const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

const readPrivateJson = (file) => {
  const absoluteFile = path.resolve(file);
  let descriptor;
  let contents;
  try {
    const before = fs.lstatSync(absoluteFile);
    if (
      before.isSymbolicLink()
      || !before.isFile()
      || (before.mode & 0o777) !== 0o600
      || (typeof process.getuid === 'function' && before.uid !== process.getuid())
    ) {
      throw new Error('PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE');
    }
    descriptor = fs.openSync(
      absoluteFile,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    const stat = fs.fstatSync(descriptor);
    if (
      !stat.isFile()
      || stat.dev !== before.dev
      || stat.ino !== before.ino
      || (stat.mode & 0o777) !== 0o600
      || (typeof process.getuid === 'function' && stat.uid !== process.getuid())
    ) {
      throw new Error('PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE');
    }
    contents = fs.readFileSync(descriptor, 'utf8');
  } catch (error) {
    if (error?.message === 'PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE') throw error;
    throw new Error('PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE');
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  try {
    return JSON.parse(contents);
  } catch {
    throw new Error('PDCF_UNSAFE_ROLE_SECRETS_INVALID');
  }
};

const loadPrivateProvision = (manifestFile, secretsFile) => {
  const absoluteManifestFile = path.resolve(manifestFile);
  const absoluteSecretsFile = path.resolve(secretsFile);
  let manifestStat;
  let secretsStat;
  try {
    manifestStat = fs.statSync(absoluteManifestFile);
    secretsStat = fs.lstatSync(absoluteSecretsFile);
  } catch {
    throw new Error('PDCF_UNSAFE_ROLE_PROVISION_INPUT_INVALID');
  }
  if (
    manifestStat.dev === secretsStat.dev
    && manifestStat.ino === secretsStat.ino
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_SECRETS_NOT_PRIVATE');
  }
  const manifest = validateProvisionManifest(readJson(absoluteManifestFile));
  assertCredentialFree(manifest);
  const secrets = validateSecrets(readPrivateJson(absoluteSecretsFile), manifest);
  return { manifest, secrets };
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

const requireSafeLabel = (value, code) => {
  if (typeof value !== 'string' || !SAFE_LABEL_PATTERN.test(value)) {
    throw new Error(code);
  }
  return value;
};

const requireProbeCapability = (value) => {
  if (!PROBE_CAPABILITIES.includes(value)) {
    throw new Error('PDCF_UNSAFE_ROLE_CAPABILITY_INVALID');
  }
  return value;
};

const requireProbeCase = (value) => value === SAFE_CONTROL_CAPABILITY
  ? value
  : requireProbeCapability(value);

const probeNames = (nonce) => {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error('PDCF_UNSAFE_ROLE_NONCE_INVALID');
  }
  return {
    roles: {
      superuser: `ctf_unsafe_super_${nonce}`,
      bypassrls: `ctf_unsafe_bypass_${nonce}`,
      createrole: `ctf_unsafe_create_role_${nonce}`,
      'schema-owner': `ctf_unsafe_schema_owner_${nonce}`,
      'schema-create': `ctf_unsafe_schema_create_${nonce}`,
    },
    ownerSchema: `ctf_unsafe_owner_${nonce}`,
    createSchema: `ctf_unsafe_create_${nonce}`,
  };
};

const buildUnsafeRoleSetupSql = ({ database, names, passwords }) => {
  const role = Object.fromEntries(Object.entries(names.roles).map(([capability, value]) => [
    capability,
    quoteIdentifier(value),
  ]));
  const password = Object.fromEntries(Object.entries(passwords).map(([capability, value]) => [
    capability,
    quoteLiteral(value),
  ]));
  const databaseIdentifier = quoteIdentifier(database);
  return `
BEGIN;
CREATE ROLE ${role.superuser}
  LOGIN NOINHERIT SUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${password.superuser};
CREATE ROLE ${role.bypassrls}
  LOGIN NOINHERIT NOSUPERUSER BYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${password.bypassrls};
CREATE ROLE ${role.createrole}
  LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB CREATEROLE NOREPLICATION
  PASSWORD ${password.createrole};
CREATE ROLE ${role['schema-owner']}
  LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${password['schema-owner']};
CREATE ROLE ${role['schema-create']}
  LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD ${password['schema-create']};
GRANT CONNECT ON DATABASE ${databaseIdentifier} TO
  ${Object.values(role).join(', ')};
CREATE SCHEMA ${quoteIdentifier(names.ownerSchema)}
  AUTHORIZATION ${role['schema-owner']};
CREATE SCHEMA ${quoteIdentifier(names.createSchema)};
REVOKE ALL ON SCHEMA ${quoteIdentifier(names.createSchema)} FROM PUBLIC;
GRANT CREATE ON SCHEMA ${quoteIdentifier(names.createSchema)}
  TO ${role['schema-create']};
COMMIT;
`;
};

const buildUnsafeRoleAuditSql = ({ names }) => {
  const probes = PROBE_CAPABILITIES.map((capability, index) =>
    `(${index + 1}, ${quoteLiteral(capability)}, ${quoteLiteral(names.roles[capability])})`
  ).join(',\n    ');
  const schemas = [
    ['owner', names.ownerSchema],
    ['create', names.createSchema],
  ].map(([label, schema]) =>
    `(${quoteLiteral(label)}, ${quoteLiteral(schema)})`
  ).join(',\n    ');
  return `
WITH probes(ordinal, capability, role_name) AS (
  VALUES
    ${probes}
), probe_schemas(label, schema_name) AS (
  VALUES
    ${schemas}
), profiles AS (
  SELECT p.ordinal,
         p.capability,
         p.role_name,
         r.rolcanlogin AS can_login,
         r.rolinherit AS inherits,
         r.rolsuper AS superuser,
         r.rolbypassrls AS bypass_rls,
         r.rolcreaterole AS create_role,
         r.rolcreatedb AS create_database,
         r.rolreplication AS replication,
         CASE WHEN r.oid IS NULL THEN false ELSE pg_catalog.has_database_privilege(
           r.oid,
           (SELECT oid FROM pg_catalog.pg_database WHERE datname = pg_catalog.current_database()),
           'CONNECT'
         ) END AS database_connect,
         COALESCE((
           SELECT pg_catalog.jsonb_agg(s.label ORDER BY s.label)
           FROM probe_schemas s
           JOIN pg_catalog.pg_namespace n ON n.nspname = s.schema_name
           WHERE n.nspowner = r.oid
         ), '[]'::jsonb) AS owned_probe_schemas,
         COALESCE((
           SELECT pg_catalog.jsonb_agg(s.label ORDER BY s.label)
           FROM probe_schemas s
           JOIN pg_catalog.pg_namespace n ON n.nspname = s.schema_name
           WHERE r.oid IS NOT NULL
             AND pg_catalog.has_schema_privilege(r.oid, n.oid, 'CREATE')
         ), '[]'::jsonb) AS create_on_probe_schemas,
         CASE WHEN r.oid IS NULL THEN -1 ELSE (
           SELECT pg_catalog.count(*)::integer
           FROM pg_catalog.pg_auth_members m
           WHERE m.member = r.oid
         ) END AS inherited_memberships
  FROM probes p
  LEFT JOIN pg_catalog.pg_roles r ON r.rolname = p.role_name
)
SELECT pg_catalog.jsonb_build_object(
  'version', 1,
  'kind', ${quoteLiteral(ROLE_AUDIT_KIND)},
  'database', pg_catalog.current_database(),
  'profiles', pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'capability', capability,
    'roleName', role_name,
    'canLogin', can_login,
    'inherits', inherits,
    'superuser', superuser,
    'bypassRls', bypass_rls,
    'createRole', create_role,
    'createDatabase', create_database,
    'replication', replication,
    'databaseConnect', database_connect,
    'ownedProbeSchemas', owned_probe_schemas,
    'createOnProbeSchemas', create_on_probe_schemas,
    'inheritedMemberships', inherited_memberships
  ) ORDER BY ordinal)
)::text
FROM profiles;
`;
};

const buildLiveCloneAuditSql = () => `
SELECT pg_catalog.jsonb_build_object(
  'version', 1,
  'kind', ${quoteLiteral(CLONE_AUDIT_KIND)},
  'cloneId', clone_id,
  'purpose', run_purpose,
  'customerId', customer_id,
  'database', pg_catalog.current_database(),
  'nonce', attestation_nonce,
  'sha256', attestation_sha256
)::text
FROM ctf_provision_private.clone_attestation
WHERE singleton = true;
`;

const buildUnsafeRoleCleanupSql = ({ names }) => `
BEGIN;
DROP SCHEMA IF EXISTS ${quoteIdentifier(names.ownerSchema)} CASCADE;
DROP SCHEMA IF EXISTS ${quoteIdentifier(names.createSchema)} CASCADE;
${Object.values(names.roles).map((role, index) => `
DO $cleanup_${index}$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = ${quoteLiteral(role)}
  ) THEN
    EXECUTE ${quoteLiteral(`DROP OWNED BY ${quoteIdentifier(role)}`)};
  END IF;
END
$cleanup_${index}$;
`).join('\n')}
${Object.values(names.roles).reverse().map((role) =>
    `DROP ROLE IF EXISTS ${quoteIdentifier(role)};`
  ).join('\n')}
COMMIT;
`;

const buildUnsafeRoleCleanupAuditSql = ({ names }) => `
SELECT pg_catalog.jsonb_build_object(
  'version', 1,
  'kind', ${quoteLiteral(CLEANUP_AUDIT_KIND)},
  'database', pg_catalog.current_database(),
  'remainingRoles', (
    SELECT pg_catalog.count(*)::integer
    FROM pg_catalog.pg_roles
    WHERE rolname = ANY(ARRAY[${Object.values(names.roles).map(quoteLiteral).join(', ')}]::text[])
  ),
  'remainingSchemas', (
    SELECT pg_catalog.count(*)::integer
    FROM pg_catalog.pg_namespace
    WHERE nspname = ANY(ARRAY[${[
      names.ownerSchema,
      names.createSchema,
    ].map(quoteLiteral).join(', ')}]::text[])
  )
)::text;
`;

const validateUnsafeRoleCleanupAudit = (audit, { database }) => {
  if (
    !exactKeys(audit, [
      'version',
      'kind',
      'database',
      'remainingRoles',
      'remainingSchemas',
    ])
    || audit.version !== 1
    || audit.kind !== CLEANUP_AUDIT_KIND
    || audit.database !== database
    || audit.remainingRoles !== 0
    || audit.remainingSchemas !== 0
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_CLEANUP_AUDIT_FAILED');
  }
  return {
    ...audit,
    passed: true,
  };
};

const runPsql = ({ database, sql, environment = process.env }) => {
  const result = spawnSync('psql', [
    '--no-psqlrc',
    '--no-align',
    '--tuples-only',
    '--quiet',
    '--set=ON_ERROR_STOP=1',
    '--dbname', database,
  ], {
    cwd: __dirname,
    env: environment,
    encoding: 'utf8',
    input: sql,
    maxBuffer: 16 * 1024 * 1024,
    timeout: 120_000,
  });
  if (result.status !== 0) {
    throw new Error('PDCF_UNSAFE_ROLE_SQL_FAILED');
  }
  return result.stdout;
};

const runPsqlJson = (input) => {
  const output = String(runPsql(input) ?? '').trim();
  if (!output || output.includes('\n')) {
    throw new Error('PDCF_UNSAFE_ROLE_AUDIT_RESULT_INVALID');
  }
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('PDCF_UNSAFE_ROLE_AUDIT_RESULT_INVALID');
  }
};

const validateLiveCloneAudit = (audit, { manifest, customer }) => {
  if (
    !exactKeys(audit, [
      'version',
      'kind',
      'cloneId',
      'purpose',
      'customerId',
      'database',
      'nonce',
      'sha256',
    ])
    || audit.version !== 1
    || audit.kind !== CLONE_AUDIT_KIND
    || audit.cloneId !== manifest.provisionClone.id
    || audit.purpose !== manifest.provisionClone.purpose
    || audit.customerId !== customer.id
    || audit.database !== customer.database
    || !/^[a-f0-9]{64}$/.test(audit.nonce ?? '')
    || audit.sha256 !== customer.provisionAttestation.sha256
    || completeServer.provisionAttestationSha256({
      cloneId: audit.cloneId,
      purpose: audit.purpose,
      customerId: audit.customerId,
      database: audit.database,
      nonce: audit.nonce,
    }) !== audit.sha256
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_LIVE_CLONE_AUDIT_INVALID');
  }
  return {
    version: 1,
    cloneId: audit.cloneId,
    purpose: audit.purpose,
    customerId: audit.customerId,
    database: audit.database,
    sha256: audit.sha256,
    verified: true,
  };
};

const expectedAuditedProfiles = () => PROBE_CAPABILITIES.map((capability) => ({
  capability,
  canLogin: true,
  inherits: false,
  superuser: capability === 'superuser',
  bypassRls: capability === 'bypassrls',
  createRole: capability === 'createrole',
  createDatabase: false,
  replication: false,
  databaseConnect: true,
  ownedProbeSchemas: capability === 'schema-owner' ? ['owner'] : [],
  createOnProbeSchemas: capability === 'superuser'
    ? ['create', 'owner']
    : capability === 'schema-owner'
      ? ['owner']
      : capability === 'schema-create'
        ? ['create']
        : [],
  inheritedMemberships: 0,
}));

const validateUnsafeRoleAudit = (audit, { database, names }) => {
  if (
    !exactKeys(audit, ['version', 'kind', 'database', 'profiles'])
    || audit.version !== 1
    || audit.kind !== ROLE_AUDIT_KIND
    || audit.database !== database
    || !Array.isArray(audit.profiles)
    || audit.profiles.length !== PROBE_CAPABILITIES.length
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_AUDIT_RESULT_INVALID');
  }
  const expectedProfiles = expectedAuditedProfiles();
  const normalized = audit.profiles.map((profile, index) => {
    const expected = expectedProfiles[index];
    if (
      !exactKeys(profile, [
        'capability',
        'roleName',
        'canLogin',
        'inherits',
        'superuser',
        'bypassRls',
        'createRole',
        'createDatabase',
        'replication',
        'databaseConnect',
        'ownedProbeSchemas',
        'createOnProbeSchemas',
        'inheritedMemberships',
      ])
      || profile.roleName !== names.roles[expected.capability]
    ) {
      throw new Error('PDCF_UNSAFE_ROLE_AUDIT_RESULT_INVALID');
    }
    const { roleName: _roleName, ...credentialFreeProfile } = profile;
    if (Object.entries(expected).some(([key, value]) =>
      JSON.stringify(credentialFreeProfile[key]) !== JSON.stringify(value)
    )) {
      throw new Error(`PDCF_UNSAFE_ROLE_PROFILE_MISMATCH:${expected.capability}`);
    }
    return expected;
  });
  return {
    version: 1,
    kind: ROLE_AUDIT_KIND,
    database,
    profiles: normalized,
    passed: true,
  };
};

const WORKER_RESULT_KEYS = Object.freeze([
  'version',
  'kind',
  'admissionScope',
  'customerId',
  'tenantId',
  'capability',
  'cloneId',
  'provisionAttestationSha256',
  'runtimeArtifactFingerprint',
  'physicalDatabaseVerifiedBeforeRoleAudit',
  'controlCredentialEnvironmentAbsent',
  'accepted',
  'rejectedCode',
  'graphileBuildsStarted',
  'residentGraphileEntries',
]);

const WORKER_ENVIRONMENT_ALLOWLIST = new Set([
  'PATH',
  'NODE_ENV',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  '__CF_USER_TEXT_ENCODING',
  'TZ',
  'PGHOST',
  'PGPORT',
  'PGSSLMODE',
  'PGSSLROOTCERT',
  'PGCHANNELBINDING',
]);
const WORKER_RUNTIME_PASSWORD_KEYS = Object.freeze(TENANTS.map(
  (tenant) => tenant.runtimePasswordEnvironment,
));
const WORKER_EXACT_ENVIRONMENT_KEYS = new Set([
  ...WORKER_ENVIRONMENT_ALLOWLIST,
  'PGDATABASE',
  ...WORKER_RUNTIME_PASSWORD_KEYS,
]);

const parseWorkerResult = (stdout) => {
  const lines = String(stdout ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    try {
      const value = JSON.parse(line);
      if (value?.version === PROBE_VERSION && value.kind === PROBE_KIND) results.push(value);
    } catch {
      // Runtime logging may precede the final one-line result. Only the exact
      // credential-free worker envelope is accepted.
    }
  }
  if (results.length !== 1 || !exactKeys(results[0], WORKER_RESULT_KEYS)) {
    throw new Error('PDCF_UNSAFE_ROLE_WORKER_RESULT_INVALID');
  }
  return results[0];
};

const makeWorkerEnvironment = (environment) => Object.fromEntries(
  Object.entries(environment ?? {}).filter(([key]) =>
    WORKER_ENVIRONMENT_ALLOWLIST.has(key)
  ),
);

const assertExactWorkerEnvironment = (environment) => {
  const keys = Object.keys(environment ?? {});
  if (
    keys.some((key) => !WORKER_EXACT_ENVIRONMENT_KEYS.has(key))
    || typeof environment?.PGDATABASE !== 'string'
    || environment.PGDATABASE.length === 0
    || WORKER_RUNTIME_PASSWORD_KEYS.some((key) =>
      typeof environment[key] !== 'string'
      || Buffer.byteLength(environment[key]) < 24
    )
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_WORKER_ENVIRONMENT_INVALID');
  }
  return true;
};

const makeProbeWorkerEnvironment = ({
  environment,
  database,
  tenantId,
  password,
  runtimePasswords,
}) => {
  const passwordEnvironment = Object.fromEntries(TENANTS.map((tenant) => {
    const value = tenant.id === tenantId ? password : runtimePasswords?.[tenant.id];
    if (typeof value !== 'string' || Buffer.byteLength(value) < 24) {
      throw new Error(`PDCF_UNSAFE_ROLE_PASSWORD_REQUIRED:${tenant.id}`);
    }
    return [tenant.runtimePasswordEnvironment, value];
  }));
  const workerEnvironment = {
    ...makeWorkerEnvironment(environment),
    PGDATABASE: database,
    ...passwordEnvironment,
  };
  assertExactWorkerEnvironment(workerEnvironment);
  return workerEnvironment;
};

const defaultRunWorker = ({
  manifestFile,
  customerId,
  database,
  tenantId,
  capability,
  role,
  password,
  runtimePasswords,
  mode,
  environment,
}) => {
  const workerEnvironment = makeProbeWorkerEnvironment({
    environment,
    database,
    tenantId,
    password,
    runtimePasswords,
  });
  const result = spawnSync(process.execPath, [
    __filename,
    '--worker',
    '--manifest', manifestFile,
    '--customer-id', customerId,
    '--tenant', tenantId,
    '--capability', capability,
    '--probe-role', role,
    '--mode', mode,
  ], {
    cwd: REPO_ROOT,
    env: workerEnvironment,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180_000,
  });
  if (result.status !== 0 || result.signal) {
    const workerCode = String(result.stderr ?? '').split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[A-Z][A-Z0-9_]{2,95}$/.test(line))
      .at(-1) ?? 'PDCF_UNSAFE_ROLE_WORKER_UNKNOWN';
    throw new Error(
      `PDCF_UNSAFE_ROLE_WORKER_FAILED:${capability}:${tenantId}:${workerCode}`,
    );
  }
  return parseWorkerResult(result.stdout);
};

const validateWorkerRejection = (result, {
  customerId,
  tenantId,
  capability,
  cloneId,
  provisionAttestationSha256,
  runtimeArtifactFingerprint,
}) => {
  if (
    !exactKeys(result, WORKER_RESULT_KEYS)
    || result.version !== PROBE_VERSION
    || result.kind !== PROBE_KIND
    || result.admissionScope !== ADMISSION_SCOPE
    || result.cloneId !== cloneId
    || result.provisionAttestationSha256 !== provisionAttestationSha256
    || result.runtimeArtifactFingerprint !== runtimeArtifactFingerprint
    || result.physicalDatabaseVerifiedBeforeRoleAudit !== true
    || result.controlCredentialEnvironmentAbsent !== true
    || result.customerId !== customerId
    || result.tenantId !== tenantId
    || result.capability !== capability
    || result.accepted !== false
    || result.rejectedCode !== 'GRAPHILE_UNSAFE_RUNTIME_ROLE'
    || result.graphileBuildsStarted !== 0
    || result.residentGraphileEntries !== 0
  ) {
    throw new Error(`PDCF_UNSAFE_ROLE_NOT_REJECTED:${capability}:${tenantId}`);
  }
  return result;
};

const validateWorkerAcceptance = (result, {
  customerId,
  tenantId,
  cloneId,
  provisionAttestationSha256,
  runtimeArtifactFingerprint,
}) => {
  if (
    !exactKeys(result, WORKER_RESULT_KEYS)
    || result.version !== PROBE_VERSION
    || result.kind !== PROBE_KIND
    || result.admissionScope !== ADMISSION_SCOPE
    || result.customerId !== customerId
    || result.tenantId !== tenantId
    || result.capability !== SAFE_CONTROL_CAPABILITY
    || result.cloneId !== cloneId
    || result.provisionAttestationSha256 !== provisionAttestationSha256
    || result.runtimeArtifactFingerprint !== runtimeArtifactFingerprint
    || result.physicalDatabaseVerifiedBeforeRoleAudit !== true
    || result.controlCredentialEnvironmentAbsent !== true
    || result.accepted !== true
    || result.rejectedCode !== null
    || result.graphileBuildsStarted !== 0
    || result.residentGraphileEntries !== 0
  ) {
    throw new Error('PDCF_SAFE_RUNTIME_ROLE_CONTROL_REJECTED');
  }
  return result;
};

const runUnsafeRuntimeStartupMatrix = ({
  manifestFile,
  secretsFile,
  expectedRuntimeArtifactFingerprint,
  mode = 'scoped-required',
  environment = process.env,
  nonce = crypto.randomBytes(6).toString('hex'),
  runSql = runPsql,
  runCloneAudit = runPsqlJson,
  runRoleAudit = runPsqlJson,
  runCleanupAudit = runPsqlJson,
  runWorker = defaultRunWorker,
} = {}) => {
  const absoluteManifestFile = path.resolve(manifestFile);
  const absoluteSecretsFile = path.resolve(secretsFile);
  const { manifest, secrets } = loadPrivateProvision(
    absoluteManifestFile,
    absoluteSecretsFile,
  );
  if (manifest.provisionClone?.purpose !== 'hostile-preflight') {
    throw new Error('PDCF_UNSAFE_ROLE_HOSTILE_CLONE_REQUIRED');
  }
  if (mode !== 'stock' && mode !== 'scoped-required') {
    throw new Error('PDCF_UNSAFE_ROLE_MODE_INVALID');
  }
  if (!SHA256_PATTERN.test(expectedRuntimeArtifactFingerprint ?? '')) {
    throw new Error('PDCF_UNSAFE_ROLE_RUNTIME_FINGERPRINT_REQUIRED');
  }
  const customer = manifest.customers[0];
  if (!customer) throw new Error('PDCF_UNSAFE_ROLE_CUSTOMER_REQUIRED');
  const liveProvisionAttestation = validateLiveCloneAudit(runCloneAudit({
    database: customer.database,
    sql: buildLiveCloneAuditSql(),
    environment,
  }), { manifest, customer });
  const names = probeNames(nonce);
  const passwords = Object.fromEntries(PROBE_CAPABILITIES.map((capability) => [
    capability,
    crypto.randomBytes(32).toString('base64url'),
  ]));
  const safeTenant = TENANTS[0];
  const safeRole = customer.roles[safeTenant.id];
  const runtimePasswords = Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    secrets.runtimePasswords[customer.roles[tenant.id]],
  ]));
  const safeControlResult = validateWorkerAcceptance(runWorker({
    manifestFile: absoluteManifestFile,
    customerId: customer.id,
    database: customer.database,
    tenantId: safeTenant.id,
    capability: SAFE_CONTROL_CAPABILITY,
    role: safeRole,
    password: secrets.runtimePasswords[safeRole],
    runtimePasswords,
    mode,
    environment,
  }), {
    customerId: customer.id,
    tenantId: safeTenant.id,
    cloneId: manifest.provisionClone.id,
    provisionAttestationSha256: customer.provisionAttestation.sha256,
    runtimeArtifactFingerprint: expectedRuntimeArtifactFingerprint,
  });
  let setupAttempted = false;
  let roleAudit;
  let cleanupAudit;
  let matrixError = null;
  const attempts = [];
  try {
    setupAttempted = true;
    runSql({
      database: customer.database,
      sql: buildUnsafeRoleSetupSql({
        database: customer.database,
        names,
        passwords,
      }),
      environment,
    });
    roleAudit = validateUnsafeRoleAudit(runRoleAudit({
      database: customer.database,
      sql: buildUnsafeRoleAuditSql({ names }),
      environment,
    }), {
      database: customer.database,
      names,
    });
    for (const capability of PROBE_CAPABILITIES) {
      for (const tenant of TENANTS) {
        const result = validateWorkerRejection(runWorker({
          manifestFile: absoluteManifestFile,
          customerId: customer.id,
          database: customer.database,
          tenantId: tenant.id,
          capability,
          role: names.roles[capability],
          password: passwords[capability],
          runtimePasswords,
          mode,
          environment,
        }), {
          customerId: customer.id,
          tenantId: tenant.id,
          capability,
          cloneId: manifest.provisionClone.id,
          provisionAttestationSha256: customer.provisionAttestation.sha256,
          runtimeArtifactFingerprint: expectedRuntimeArtifactFingerprint,
        });
        attempts.push({
          capability,
          tenantId: tenant.id,
          rejectedCode: result.rejectedCode,
          controlCredentialEnvironmentAbsent:
            result.controlCredentialEnvironmentAbsent,
          graphileBuildsStarted: result.graphileBuildsStarted,
          residentGraphileEntries: result.residentGraphileEntries,
        });
      }
    }
  } catch (error) {
    matrixError = error;
  }
  let cleanupError = null;
  if (setupAttempted) {
    try {
      runSql({
        database: customer.database,
        sql: buildUnsafeRoleCleanupSql({ names }),
        environment,
      });
      cleanupAudit = validateUnsafeRoleCleanupAudit(runCleanupAudit({
        database: customer.database,
        sql: buildUnsafeRoleCleanupAuditSql({ names }),
        environment,
      }), { database: customer.database });
    } catch (error) {
      cleanupError = error;
    }
  }
  if (cleanupError) {
    throw new Error('PDCF_UNSAFE_ROLE_CLEANUP_FAILED', { cause: cleanupError });
  }
  if (matrixError) throw matrixError;
  const report = {
    version: PROBE_VERSION,
    kind: PROBE_KIND,
    admissionScope: ADMISSION_SCOPE,
    provisionClone: {
      version: manifest.provisionClone.version,
      id: manifest.provisionClone.id,
      purpose: manifest.provisionClone.purpose,
      attestationSetSha256: manifest.provisionClone.attestationSetSha256,
    },
    representativeCustomerId: customer.id,
    representativePhysicalDatabase: customer.physicalIdentity,
    representativeProvisionAttestationSha256:
      customer.provisionAttestation.sha256,
    canonicalDatabaseContractFingerprint:
      manifest.canonicalDatabaseContractFingerprint,
    runtimeArtifactFingerprint: expectedRuntimeArtifactFingerprint,
    liveProvisionAttestation,
    safeStartupControl: {
      tenantId: safeControlResult.tenantId,
      accepted: safeControlResult.accepted,
      physicalDatabaseVerifiedBeforeRoleAudit:
        safeControlResult.physicalDatabaseVerifiedBeforeRoleAudit,
      controlCredentialEnvironmentAbsent:
        safeControlResult.controlCredentialEnvironmentAbsent,
      graphileBuildsStarted: safeControlResult.graphileBuildsStarted,
      residentGraphileEntries: safeControlResult.residentGraphileEntries,
      passed: true,
    },
    roleProfileAudit: roleAudit,
    cleanupAudit,
    capabilities: [...PROBE_CAPABILITIES],
    surfaces: TENANTS.map((tenant) => tenant.id),
    attempts,
    expectedAttempts: PROBE_CAPABILITIES.length * TENANTS.length,
    rejectedAttempts: attempts.length,
    acceptedAttempts: 0,
    graphileBuildsStarted: attempts.reduce(
      (sum, attempt) => sum + attempt.graphileBuildsStarted,
      0,
    ),
    residentGraphileEntries: attempts.reduce(
      (sum, attempt) => sum + attempt.residentGraphileEntries,
      0,
    ),
    passed: attempts.length === PROBE_CAPABILITIES.length * TENANTS.length,
  };
  assertCredentialFree(report);
  return report;
};

const verifyPhysicalDatabaseWithRuntimeCredential = async ({
  database,
  role,
  password,
}) => {
  const { Pool } = require(path.join(REPO_ROOT, 'graphql/server/node_modules/pg'));
  const pool = new Pool({
    database,
    user: role,
    password,
    max: 1,
    connectionTimeoutMillis: 5_000,
    application_name: 'unsafe-runtime-startup-probe',
  });
  try {
    const result = await pool.query(`
      SELECT pg_catalog.current_database()::text AS database,
             current_user::text AS role
    `);
    if (
      result.rowCount !== 1
      || result.rows[0]?.database !== database
      || result.rows[0]?.role !== role
    ) {
      throw new Error('PDCF_UNSAFE_ROLE_PHYSICAL_DATABASE_MISMATCH');
    }
    return true;
  } finally {
    await pool.end();
  }
};

const workerProbe = async ({
  manifestFile,
  customerId,
  tenantId,
  capability,
  probeRole,
  mode,
  environment = process.env,
}) => {
  assertExactWorkerEnvironment(environment);
  const controlCredentialEnvironmentAbsent = true;
  requireSafeLabel(customerId, 'PDCF_UNSAFE_ROLE_CUSTOMER_INVALID');
  requireSafeLabel(tenantId, 'PDCF_UNSAFE_ROLE_TENANT_INVALID');
  requireProbeCase(capability);
  if (!TENANTS.some((tenant) => tenant.id === tenantId)) {
    throw new Error('PDCF_UNSAFE_ROLE_TENANT_INVALID');
  }
  if (typeof probeRole !== 'string' || !/^[a-z_][a-z0-9_]{0,62}$/.test(probeRole)) {
    throw new Error('PDCF_UNSAFE_ROLE_NAME_INVALID');
  }
  const selectedTenant = TENANTS.find((tenant) => tenant.id === tenantId);
  const password = environment[selectedTenant.runtimePasswordEnvironment];
  if (typeof password !== 'string' || Buffer.byteLength(password) < 24) {
    throw new Error('PDCF_UNSAFE_ROLE_PASSWORD_REQUIRED');
  }
  const manifest = validateProvisionManifest(readJson(manifestFile));
  assertCredentialFree(manifest);
  if (
    manifest.fixture !== FIXTURE_ID
    || manifest.provisionClone?.purpose !== 'hostile-preflight'
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_HOSTILE_CLONE_REQUIRED');
  }
  const customer = manifest.customers.find((candidate) => candidate.id === customerId);
  if (!customer) throw new Error('PDCF_UNSAFE_ROLE_CUSTOMER_INVALID');
  if (environment.PGDATABASE !== customer.database) {
    throw new Error('PDCF_UNSAFE_ROLE_PHYSICAL_DATABASE_MISMATCH');
  }
  if (
    capability === SAFE_CONTROL_CAPABILITY
      ? probeRole !== customer.roles[tenantId]
      : !PROBE_ROLE_PATTERNS[capability].test(probeRole)
  ) {
    throw new Error('PDCF_UNSAFE_ROLE_NAME_INVALID');
  }
  const runtimeRoles = capability === SAFE_CONTROL_CAPABILITY
    ? { ...customer.roles }
    : { ...customer.roles, [tenantId]: probeRole };
  const childEnvironment = {
    ...makeWorkerEnvironment(environment),
    PGDATABASE: customer.database,
    ...Object.fromEntries(TENANTS.map((tenant) => [
      tenant.runtimePasswordEnvironment,
      environment[tenant.runtimePasswordEnvironment],
    ])),
  };
  if (environment === process.env) {
    Object.assign(process.env, childEnvironment);
  }
  const physicalDatabaseVerifiedBeforeRoleAudit =
    await verifyPhysicalDatabaseWithRuntimeCredential({
      database: customer.database,
      role: probeRole,
      password,
    });
  const options = {
    ...completeServer.parseServerOptions([
      '--host', '127.0.0.1',
      '--port', '3391',
      '--arm', 'unsafe-runtime-startup-probe',
      '--mode', mode,
      '--introspection-client-release-mode', 'destroy',
      '--runtime-pool-max', '2',
      '--enable-realtime', 'true',
      ...TENANTS.flatMap((tenant) => [
        `--${tenant.runtimeRoleArgument}`,
        runtimeRoles[tenant.id],
      ]),
    ], childEnvironment),
    runPurpose: 'hostile-preflight',
    cloneId: manifest.provisionClone.id,
  };
  let accepted = false;
  let rejectedCode = null;
  let server = null;
  try {
    server = await completeServer.createFixtureServer(options, childEnvironment);
    accepted = true;
  } catch (error) {
    rejectedCode = typeof error?.code === 'string' ? error.code : null;
    if (rejectedCode !== 'GRAPHILE_UNSAFE_RUNTIME_ROLE') throw error;
  } finally {
    if (server) {
      await server.close();
    } else {
      // createFixtureServer has not returned its close handle when startup is
      // rejected, but its pre-publication role audit may already have leased
      // pools. End them explicitly so each isolated worker exits immediately
      // instead of waiting for node-postgres idle timeouts.
      await require(path.join(
        REPO_ROOT,
        'postgres/pg-cache/dist/index.js',
      )).teardownPgPools();
    }
  }
  const graphileCache = require(path.join(
    REPO_ROOT,
    'graphile/graphile-cache/dist/index.js',
  )).graphileCache;
  const buildStats = require(path.join(
    REPO_ROOT,
    'graphql/server/dist/middleware/observability/graphile-build-stats.js',
  )).getGraphileBuildStats();
  const result = {
    version: PROBE_VERSION,
    kind: PROBE_KIND,
    admissionScope: ADMISSION_SCOPE,
    customerId,
    tenantId,
    capability,
    cloneId: manifest.provisionClone.id,
    provisionAttestationSha256: customer.provisionAttestation.sha256,
    runtimeArtifactFingerprint: completeServer.runtimeArtifactFingerprint(),
    physicalDatabaseVerifiedBeforeRoleAudit,
    controlCredentialEnvironmentAbsent,
    accepted,
    rejectedCode,
    graphileBuildsStarted: buildStats.started,
    residentGraphileEntries: graphileCache.size,
  };
  assertCredentialFree(result);
  return result;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.worker !== true) throw new Error('PDCF_UNSAFE_ROLE_WORKER_REQUIRED');
  const result = await workerProbe({
    manifestFile: path.resolve(requireString(args, 'manifest')),
    customerId: requireString(args, 'customer-id'),
    tenantId: requireString(args, 'tenant'),
    capability: requireString(args, 'capability'),
    probeRole: requireString(args, 'probe-role'),
    mode: requireString(args, 'mode', 'scoped-required'),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    const code = typeof error?.code === 'string'
      ? error.code
      : String(error instanceof Error ? error.message : error).split(':', 1)[0];
    process.stderr.write(`${code}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ADMISSION_SCOPE,
  CLEANUP_AUDIT_KIND,
  CLONE_AUDIT_KIND,
  PROBE_CAPABILITIES,
  PROBE_KIND,
  ROLE_AUDIT_KIND,
  SAFE_CONTROL_CAPABILITY,
  assertExactWorkerEnvironment,
  buildLiveCloneAuditSql,
  buildUnsafeRoleAuditSql,
  buildUnsafeRoleCleanupAuditSql,
  buildUnsafeRoleCleanupSql,
  buildUnsafeRoleSetupSql,
  expectedAuditedProfiles,
  loadPrivateProvision,
  makeProbeWorkerEnvironment,
  makeWorkerEnvironment,
  parseWorkerResult,
  probeNames,
  runUnsafeRuntimeStartupMatrix,
  validateLiveCloneAudit,
  validateUnsafeRoleCleanupAudit,
  validateUnsafeRoleAudit,
  validateWorkerAcceptance,
  validateWorkerRejection,
  verifyPhysicalDatabaseWithRuntimeCredential,
  workerProbe,
};
