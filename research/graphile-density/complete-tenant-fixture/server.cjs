'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

const {
  REPO_ROOT,
  TENANTS,
  parseArgs,
  parsePositiveInteger,
  requireString,
} = require('./lib.cjs');

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);
const RUNTIME_DEPENDENCY_SCHEMAS = Object.freeze(['ctf_extensions', 'jwt_private']);
const INTROSPECTION_DEPENDENCY_SCHEMAS = Object.freeze(['ctf_extensions']);
const realtimeSchemaFor = (tenant) => `${tenant.schema}_realtime`;
const runtimeDependencySchemasFor = (tenant, enableRealtime) => [
  ...RUNTIME_DEPENDENCY_SCHEMAS,
  ...(enableRealtime ? [realtimeSchemaFor(tenant)] : []),
];
const matchTenantUpgradePath = (rawUrl, pathPrefix = '') => {
  if (
    typeof rawUrl !== 'string'
    || typeof pathPrefix !== 'string'
    || rawUrl.includes('?')
    || (pathPrefix !== '' && (!pathPrefix.startsWith('/') || pathPrefix.endsWith('/')))
    || pathPrefix.includes('..')
  ) return null;
  const basePath = `${pathPrefix}/tenant/`;
  if (!rawUrl.startsWith(basePath)) return null;
  const parts = rawUrl.slice(basePath.length).split('/');
  return parts.length === 2 && parts[1] === 'graphql' && /^[a-z0-9-]+$/.test(parts[0])
    ? parts[0]
    : null;
};
const GRAFAST_CACHE_LIMITS = Object.freeze({
  queryCacheMaxLength: 8,
  operationsCacheMaxLength: 8,
  operationOperationPlansCacheMaxLength: 8,
});
const RELEASE_BUILD_STATE_AFTER_VALIDATION = true;
const FEATURE_SETTINGS = Object.freeze({
  enableAggregates: false,
  enablePostgis: true,
  enableSearch: true,
  enableDirectUploads: true,
  enablePresignedUploads: true,
  enableManyToMany: true,
  enableConnectionFilter: true,
  enableLtree: true,
  enableLlm: true,
  enableRealtime: true,
  enableBulk: true,
  enableI18n: true,
  enableHistory: false,
});
const RUNTIME_ARTIFACT_PATHS = Object.freeze([
  'graphile/graphile-cache/dist/index.js',
  'graphile/graphile-cache/dist/create-instance.js',
  'graphile/graphile-cache/dist/graphile-cache.js',
  'graphile/graphile-cache/dist/http-adapter.js',
  'graphile/graphile-cache/dist/preset-services.js',
  'graphile/graphile-cache/dist/realtime-readiness.js',
  'graphile/graphile-realtime-subscriptions/dist/index.js',
  'graphile/graphile-realtime-subscriptions/dist/cursor-tracker.js',
  'graphile/graphile-realtime-subscriptions/dist/realtime-manager.js',
  'graphile/graphile-settings/dist/index.js',
  'postgres/pg-cache/dist/index.js',
  'packages/express-context/dist/index.js',
  'graphile/graphile-llm/dist/index.js',
  'graphile/graphile-function-bindings/dist/index.js',
  'graphile/graphile-presigned-url-plugin/dist/index.js',
  'graphql/server/dist/plugins/auth-cookie-plugin.js',
  'graphql/server/dist/middleware/graphile-build-contract.js',
  'graphql/server/dist/middleware/graphile-build-governor.js',
  'graphql/server/dist/middleware/runtime-role-safety.js',
  'graphql/server/dist/middleware/observability/graphile-build-stats.js',
  'graphql/server/dist/diagnostics/debug-memory-snapshot.js',
]);
const INSTALLED_RUNTIME_ARTIFACT_SPECS = Object.freeze([
  Object.freeze({
    label: 'installed:@dataplan/pg:dist/index.js',
    resolveSpecifier: '@dataplan/pg',
    relativePath: null,
    markers: Object.freeze([
      'exports.exactClientReleaseCapability = "dataplan-pg-exact-client-destroy-v1";',
    ]),
  }),
  Object.freeze({
    label: 'installed:@dataplan/pg:dist/adaptors/pg.js',
    resolveSpecifier: '@dataplan/pg/adaptors/pg',
    relativePath: null,
    markers: Object.freeze([
      'const DESTROYABLE_CLIENT_RELEASE_MODES = Object.freeze(["reuse", "destroy"]);',
      'const supportsExactClientDestruction = typeof PgPool === "function" && pool instanceof PgPool;',
      'Exact PostgreSQL client destruction requires a node-postgres Pool',
      'pgClient.release(true);',
      '? DESTROYABLE_CLIENT_RELEASE_MODES',
    ]),
  }),
  Object.freeze({
    label: 'installed:@dataplan/pg:dist/pgServices.js',
    resolveSpecifier: '@dataplan/pg',
    relativePath: 'pgServices.js',
    markers: Object.freeze([
      'withPgClient.supportedClientReleaseModes = originalWithPgClient.supportedClientReleaseModes;',
      'const clientReleaseMode = options?.clientReleaseMode ?? "reuse";',
      'does not support exact client destruction',
    ]),
  }),
  Object.freeze({
    label: 'installed:graphile-build-pg:dist/index.js',
    resolveSpecifier: 'graphile-build-pg',
    relativePath: null,
    markers: Object.freeze([
      'exports.introspectionClientReleaseCapability = "graphile-build-pg-exact-client-destroy-v1";',
    ]),
  }),
  Object.freeze({
    label: 'installed:graphile-build-pg:dist/plugins/PgIntrospectionPlugin.js',
    resolveSpecifier: 'graphile-build-pg',
    relativePath: 'plugins/PgIntrospectionPlugin.js',
    markers: Object.freeze([
      'pgService.introspectionClientReleaseMode ?? "reuse"',
      'clientReleaseMode === "reuse" ? undefined : { clientReleaseMode }',
    ]),
  }),
]);

const requireBuilt = (relativePath) => {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`CTF_BUILD_ARTIFACT_MISSING:${relativePath}`);
  }
  return require(absolutePath);
};

const readInstalledRuntimeArtifacts = () => {
  const graphileSettingsEntry = path.join(
    REPO_ROOT,
    'graphile/graphile-settings/dist/index.js',
  );
  const graphileSettingsRequire = createRequire(graphileSettingsEntry);
  let postgraphilePgEntry;
  try {
    postgraphilePgEntry = graphileSettingsRequire.resolve('postgraphile/adaptors/pg');
  } catch {
    throw new Error('CTF_INSTALLED_RUNTIME_ARTIFACT_MISSING:postgraphile/adaptors/pg');
  }
  const postgraphileRequire = createRequire(postgraphilePgEntry);

  return INSTALLED_RUNTIME_ARTIFACT_SPECS.map((spec) => {
    let resolvedEntry;
    try {
      resolvedEntry = postgraphileRequire.resolve(spec.resolveSpecifier);
    } catch {
      throw new Error(`CTF_INSTALLED_RUNTIME_ARTIFACT_MISSING:${spec.label}`);
    }
    const absolutePath = spec.relativePath === null
      ? resolvedEntry
      : path.join(path.dirname(resolvedEntry), spec.relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`CTF_INSTALLED_RUNTIME_ARTIFACT_MISSING:${spec.label}`);
    }
    const bytes = fs.readFileSync(absolutePath);
    const source = bytes.toString('utf8');
    spec.markers.forEach((marker, markerIndex) => {
      if (!source.includes(marker)) {
        throw new Error(
          `CTF_INSTALLED_RUNTIME_MARKER_MISSING:${spec.label}:${markerIndex}`
        );
      }
    });
    return { bytes, spec };
  });
};

const installedRuntimeArtifactManifest = () => readInstalledRuntimeArtifacts().map(
  ({ bytes, spec }) => ({
    label: spec.label,
    sha256: `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`,
    markerSetSha256: `sha256:${crypto.createHash('sha256')
      .update(JSON.stringify(spec.markers))
      .digest('hex')}`,
    markerCount: spec.markers.length,
  }),
);

const STATIC_REQUIRE_PATTERN = /\brequire(?:\.resolve)?\(\s*(['"])([^'"\r\n]+)\1\s*\)/g;

const localDistRelativePath = (absolutePath) => {
  let realPath;
  try {
    realPath = fs.realpathSync(absolutePath);
  } catch {
    return null;
  }
  const relativePath = path.relative(REPO_ROOT, realPath);
  if (
    relativePath.startsWith('..')
    || path.isAbsolute(relativePath)
    || relativePath.split(path.sep).includes('node_modules')
    || !relativePath.split(path.sep).includes('dist')
    || !/\.(?:c|m)?js$/.test(relativePath)
  ) return null;
  return relativePath.split(path.sep).join('/');
};

const staticRequireSpecifiers = (source) => {
  const specifiers = new Set();
  for (const match of source.matchAll(STATIC_REQUIRE_PATTERN)) specifiers.add(match[2]);
  return [...specifiers].sort();
};

const resolvedLocalRuntimeArtifactManifest = () => {
  const queue = RUNTIME_ARTIFACT_PATHS.map((relativePath) => {
    const absolutePath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`CTF_BUILD_ARTIFACT_MISSING:${relativePath}`);
    }
    return fs.realpathSync(absolutePath);
  });
  const artifacts = new Map();
  while (queue.length > 0) {
    const absolutePath = queue.shift();
    const relativePath = localDistRelativePath(absolutePath);
    if (!relativePath || artifacts.has(relativePath)) continue;
    const bytes = fs.readFileSync(absolutePath);
    artifacts.set(relativePath, {
      path: relativePath,
      sha256: `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`,
    });
    const localRequire = createRequire(absolutePath);
    for (const specifier of staticRequireSpecifiers(bytes.toString('utf8'))) {
      let resolved;
      try {
        resolved = localRequire.resolve(specifier);
      } catch {
        // Generated source can contain documentation examples and optional
        // package probes. Only successfully resolved JavaScript can belong to
        // the concrete runtime closure for this installation.
        continue;
      }
      if (localDistRelativePath(resolved)) queue.push(fs.realpathSync(resolved));
    }
  }
  return [...artifacts.values()].sort((left, right) => left.path.localeCompare(right.path));
};

const loadInstalledDataplanPgAdaptor = () => {
  const graphileSettingsEntry = path.join(
    REPO_ROOT,
    'graphile/graphile-settings/dist/index.js',
  );
  const graphileSettingsRequire = createRequire(graphileSettingsEntry);
  let postgraphilePgEntry;
  try {
    postgraphilePgEntry = graphileSettingsRequire.resolve('postgraphile/adaptors/pg');
  } catch {
    throw new Error('CTF_INSTALLED_RUNTIME_ARTIFACT_MISSING:postgraphile/adaptors/pg');
  }
  const postgraphileRequire = createRequire(postgraphilePgEntry);
  let adaptor;
  try {
    adaptor = postgraphileRequire('@dataplan/pg/adaptors/pg');
  } catch {
    throw new Error(
      'CTF_INSTALLED_RUNTIME_ARTIFACT_MISSING:installed:@dataplan/pg:dist/adaptors/pg.js'
    );
  }
  if (typeof adaptor?.makePgAdaptorWithPgClient !== 'function') {
    throw new Error('CTF_DATAPLAN_PREPARED_STATEMENT_ATTESTATION_UNAVAILABLE');
  }
  return adaptor;
};

let cachedRuntimeArtifactManifest = null;
let cachedRuntimeArtifactFingerprint = null;
const runtimeArtifactManifest = () => {
  if (!cachedRuntimeArtifactManifest) {
    cachedRuntimeArtifactManifest = Object.freeze({
      version: 2,
      roots: Object.freeze([...RUNTIME_ARTIFACT_PATHS]),
      localDistClosure: Object.freeze(resolvedLocalRuntimeArtifactManifest()),
      installedPatchedArtifacts: Object.freeze(installedRuntimeArtifactManifest()),
    });
  }
  return cachedRuntimeArtifactManifest;
};

const runtimeArtifactFingerprint = () => {
  if (!cachedRuntimeArtifactFingerprint) {
    cachedRuntimeArtifactFingerprint = `sha256:${crypto.createHash('sha256')
      .update(JSON.stringify(runtimeArtifactManifest()))
      .digest('hex')}`;
  }
  return cachedRuntimeArtifactFingerprint;
};

const parseBooleanArgument = (value, label, fallback = false) => {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`CTF_INVALID_BOOLEAN:${label}`);
};

const provisionAttestationSha256 = ({
  cloneId,
  purpose,
  customerId,
  database,
  nonce,
}) => {
  const digest = crypto.createHash('sha256');
  for (const value of [
    'physical-database-density-provision-attestation-v1',
    cloneId,
    purpose,
    customerId,
    database,
    nonce,
  ]) {
    digest.update(value);
    digest.update('\0');
  }
  return `sha256:${digest.digest('hex')}`;
};

const validateExpectedProvisionAttestation = (value, customerId, database) => {
  if (value == null) return null;
  if (
    JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify(['cloneId', 'purpose', 'sha256', 'version'])
    ||
    value?.version !== 1
    || typeof value.cloneId !== 'string'
    || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value.cloneId)
    || (value.purpose !== 'hostile-preflight' && value.purpose !== 'measurement')
    || typeof customerId !== 'string'
    || !/^[a-z0-9-]+$/.test(customerId)
    || typeof database !== 'string'
    || !database
    || !/^sha256:[a-f0-9]{64}$/.test(value.sha256 ?? '')
  ) {
    throw new Error('CTF_PROVISION_ATTESTATION_EXPECTATION_INVALID');
  }
  return value;
};

const hostileControlEnabledFor = (runPurpose, expectedProvisionAttestation) =>
  expectedProvisionAttestation == null || runPurpose === 'hostile-preflight';

const CONTROL_POOL_MAX = 1;
const PREPARED_STATEMENT_ATTESTATION_KIND =
  'loaded-dataplan-adaptor-behavior-v1';

const parseRuntimePoolMaxUses = (value, label = 'runtime-pool-max-uses') => {
  if (value === 'unlimited') return null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error(`CTF_INVALID_MAX_USES:${label}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`CTF_INVALID_MAX_USES:${label}`);
  }
  return parsed;
};

const fixtureConfigurationIdentity = ({
  databaseName,
  mode,
  introspectionClientReleaseMode,
  enableRealtime,
  realtimeNotificationMode,
  realtimeCursorPollIntervalMs,
  realtimeCursorHeartbeatIntervalMs,
  runtimeFingerprint,
}) => {
  if (
    typeof databaseName !== 'string'
    || databaseName.length === 0
    || typeof runtimeFingerprint !== 'string'
    || !/^sha256:[a-f0-9]{64}$/.test(runtimeFingerprint)
  ) {
    throw new Error('CTF_CONFIGURATION_IDENTITY_INPUT_INVALID');
  }
  const input = {
    version: 1,
    fixture: 'complete-tenant-abc-v1',
    databaseName,
    mode,
    introspectionClientReleaseMode,
    enableRealtime,
    realtimeNotificationMode: enableRealtime ? realtimeNotificationMode : null,
    realtimeCursorPollIntervalMs: enableRealtime
      ? realtimeCursorPollIntervalMs
      : null,
    realtimeCursorHeartbeatIntervalMs: enableRealtime
      ? realtimeCursorHeartbeatIntervalMs
      : null,
    runtimeFingerprint,
    featureSettings: FEATURE_SETTINGS,
    grafastCache: GRAFAST_CACHE_LIMITS,
    releaseBuildStateAfterValidation: RELEASE_BUILD_STATE_AFTER_VALIDATION,
  };
  return `graphile-configuration:ctf:v1:${crypto.createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')}`;
};

const credentialFreeContractEvidence = (kind, input) => ({
  version: 1,
  fingerprint: `${kind}:v1:${crypto.createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')}`,
  input,
});

const runtimePoolContractEvidence = ({
  databaseName,
  role,
  poolMax,
  poolMaxUses,
  runtimeFingerprint,
  purpose = 'runtime',
  sanitizeOnCheckout = true,
}) => credentialFreeContractEvidence('pg-contract-evidence', {
  version: 1,
  databaseName,
  role,
  pool: {
    max: poolMax,
    maxUses: poolMaxUses,
  },
  purpose,
  sanitizeOnCheckout,
  runtimeFingerprint,
});

const preparedResetBackendEvidence = (
  firstBackendPid,
  secondBackendPid,
  runtimePoolMaxUses,
) => {
  const pidsValid = Number.isSafeInteger(firstBackendPid)
    && firstBackendPid > 0
    && Number.isSafeInteger(secondBackendPid)
    && secondBackendPid > 0;
  const observed = !pidsValid
    ? 'invalid'
    : firstBackendPid === secondBackendPid
      ? 'same-client'
      : 'rotated-client';
  const expected = runtimePoolMaxUses === null
    ? 'same-client'
    : runtimePoolMaxUses === 1
      ? 'rotated-client'
      : 'unsupported';
  return {
    firstBackendPid: pidsValid ? firstBackendPid : null,
    secondBackendPid: pidsValid ? secondBackendPid : null,
    observed,
    expected,
    exact: pidsValid && expected !== 'unsupported' && observed === expected,
  };
};

const nativePoolMaxUses = (pool) => {
  const value = pool?.options?.maxUses;
  if (value === Number.POSITIVE_INFINITY) return { known: true, value: null };
  if (Number.isSafeInteger(value) && value > 0) return { known: true, value };
  return { known: false, value: null };
};

const makeRuntimePoolStats = (pgCache, runtimePoolIdentities, requestedMaxUses) => {
  const identities = [...runtimePoolIdentities];
  const distinctIdentities = new Set(identities);
  const identitiesUnique = distinctIdentities.size === identities.length;
  const recordsAvailable = pgCache?.records instanceof Map;
  const records = recordsAvailable
    ? identities.map((identity) => pgCache.records.get(identity) ?? null)
    : identities.map(() => null);
  const pools = records.map((record) => record?.pool ?? null);
  const observedPoolObjects = pools.filter(Boolean);
  const distinctPoolObjects = new Set(observedPoolObjects);
  const poolObjectsUnique = distinctPoolObjects.size === observedPoolObjects.length;
  const countsAvailable = pools.every((pool) =>
    pool
    && typeof pool.totalCount === 'number'
    && typeof pool.idleCount === 'number'
    && typeof pool.waitingCount === 'number'
  );
  const effective = pools.map(nativePoolMaxUses);
  const effectiveKnown = effective.every((entry) => entry.known);
  const effectiveValues = effectiveKnown
    ? [...new Set(effective.map((entry) => entry.value))]
    : [];
  const effectiveMaxUsesKnown = effectiveValues.length === 1;
  const effectiveMaxUses = effectiveMaxUsesKnown ? effectiveValues[0] : null;
  const observedPools = distinctPoolObjects.size;
  const available = recordsAvailable
    && identitiesUnique
    && poolObjectsUnique
    && observedPools === identities.length
    && countsAvailable
    && effectiveMaxUsesKnown;
  return {
    scope: 'runtime-only-exact-identities',
    available,
    requestedMaxUses,
    effectiveMaxUses,
    effectiveMaxUsesKnown,
    maxUsesExact: available && effectiveMaxUses === requestedMaxUses,
    identitiesUnique,
    poolObjectsUnique,
    expectedPools: identities.length,
    observedPools,
    totalClients: available
      ? pools.reduce((sum, pool) => sum + pool.totalCount, 0)
      : null,
    idleClients: available
      ? pools.reduce((sum, pool) => sum + pool.idleCount, 0)
      : null,
    waitingClients: available
      ? pools.reduce((sum, pool) => sum + pool.waitingCount, 0)
      : null,
  };
};

const preparedStatementCacheRequestFromEnvironment = (environment) => {
  const raw = environment.DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  const requestedSize = normalized === '' ? 100 : Number(normalized);
  if (
    !Number.isSafeInteger(requestedSize)
    || requestedSize < 0
    || requestedSize > 10_000
    || (raw != null && (
      typeof raw !== 'string'
      || String(requestedSize) !== raw
    ))
  ) {
    throw new Error('CTF_PREPARED_STATEMENT_CACHE_SIZE_INVALID');
  }
  return {
    environmentValue: typeof raw === 'string' ? raw : null,
    requestedSize,
    environmentCanonical: typeof raw === 'string'
      && String(requestedSize) === raw,
  };
};

const attestDataplanPreparedStatementCache = async (adaptor, request) => {
  if (typeof adaptor?.makePgAdaptorWithPgClient !== 'function') {
    throw new Error('CTF_DATAPLAN_PREPARED_STATEMENT_ATTESTATION_UNAVAILABLE');
  }
  const requestedSize = request?.requestedSize;
  if (!Number.isSafeInteger(requestedSize) || requestedSize < 0 || requestedSize > 10_000) {
    throw new Error('CTF_PREPARED_STATEMENT_CACHE_SIZE_INVALID');
  }

  const parsedStatements = Object.create(null);
  const namedQueries = [];
  const deallocations = [];
  let releases = 0;
  const rawClient = {
    connection: { parsedStatements },
    addListener() {},
    removeListener() {},
    escapeIdentifier(identifier) {
      return `"${String(identifier).replaceAll('"', '""')}"`;
    },
    query(query) {
      if (typeof query === 'string') {
        if (query.startsWith('deallocate ')) {
          deallocations.push({
            afterNamedQueries: namedQueries.length,
            sql: query,
          });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (typeof query?.name === 'string') {
        namedQueries.push(query.name);
        parsedStatements[query.name] = query.text;
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    },
    release() {
      releases += 1;
    },
  };
  const pool = { connect: async () => rawClient };
  const withPgClient = adaptor.makePgAdaptorWithPgClient(pool);
  const queryCount = Math.max(1, requestedSize + 1);
  await withPgClient(null, async (client) => {
    for (let index = 0; index < queryCount; index += 1) {
      await client.query({
        text: `select ${index}`,
        name: `ctf_prepared_cache_attestation_${index}`,
        values: [],
        arrayMode: false,
      });
    }
  });
  // Dataplan's LRU disposer intentionally performs DEALLOCATE asynchronously.
  // One turn lets its bookkeeping settle before this proof is published.
  await new Promise((resolve) => setImmediate(resolve));

  const firstEvictionAfterNamedQueries = deallocations[0]?.afterNamedQueries ?? null;
  const effectiveSize = namedQueries.length === 0
    ? 0
    : firstEvictionAfterNamedQueries;
  const expectedFirstName = 'ctf_prepared_cache_attestation_0';
  const exact = releases === 1
    && (
      requestedSize === 0
        ? namedQueries.length === 0
          && deallocations.length === 0
          && rawClient.connection._graphilePreparedStatementCache == null
        : namedQueries.length === queryCount
          && deallocations.length === 1
          && firstEvictionAfterNamedQueries === requestedSize
          && deallocations[0].sql === `deallocate ${rawClient.escapeIdentifier(expectedFirstName)}`
          && rawClient.connection._graphilePreparedStatementCache != null
    );
  return {
    ...request,
    attestation: PREPARED_STATEMENT_ATTESTATION_KIND,
    effectiveSize,
    effectiveSizeKnown: effectiveSize != null,
    exact,
    namedQueriesObserved: namedQueries.length,
    firstEvictionAfterNamedQueries,
  };
};

const parseServerOptions = (argv, environment = process.env) => {
  const args = parseArgs(argv);
  const host = requireString(args, 'host', '127.0.0.1');
  if (!LOOPBACK_HOSTS.has(host)) throw new Error('CTF_SERVER_LOOPBACK_REQUIRED');
  const mode = requireString(args, 'mode', 'scoped-required');
  if (!['stock', 'scoped-required'].includes(mode)) {
    throw new Error(`CTF_INTROSPECTION_MODE_INVALID:${mode}`);
  }
  const introspectionClientReleaseMode = requireString(
    args,
    'introspection-client-release-mode',
    'destroy',
  );
  if (!['reuse', 'destroy'].includes(introspectionClientReleaseMode)) {
    throw new Error(
      `CTF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:${introspectionClientReleaseMode}`
    );
  }
  const runtimeRoles = Object.fromEntries(TENANTS.map((tenant) => [
    tenant.id,
    requireString(
      args,
      tenant.runtimeRoleArgument,
      environment[`CTF_RUNTIME_${tenant.id.toUpperCase()}_PGUSER`],
    ),
  ]));
  if (new Set(Object.values(runtimeRoles)).size !== TENANTS.length) {
    throw new Error('CTF_RUNTIME_ROLES_MUST_BE_DISTINCT');
  }
  for (const tenant of TENANTS) {
    const password = environment[tenant.runtimePasswordEnvironment]
      ?? environment.GRAPHQL_RUNTIME_PGPASSWORD;
    if (typeof password !== 'string' || password.length === 0) {
      throw new Error(`CTF_RUNTIME_PASSWORD_REQUIRED:${tenant.runtimePasswordEnvironment}`);
    }
  }
  const runtimePoolMax = parsePositiveInteger(
    args['runtime-pool-max'] ?? '1',
    'runtime-pool-max',
  );
  const runtimePoolMaxUses = parseRuntimePoolMaxUses(
    args['runtime-pool-max-uses'] ?? 'unlimited',
  );
  const enableRealtime = parseBooleanArgument(args['enable-realtime'], 'enable-realtime');
  const realtimeNotificationMode = requireString(
    args,
    'realtime-notification-mode',
    'dedicated',
  );
  if (!['dedicated', 'shared-exact'].includes(realtimeNotificationMode)) {
    throw new Error(
      `CTF_REALTIME_NOTIFICATION_MODE_INVALID:${realtimeNotificationMode}`
    );
  }
  if (!enableRealtime && realtimeNotificationMode !== 'dedicated') {
    throw new Error('CTF_SHARED_REALTIME_REQUIRES_REALTIME');
  }
  // Dedicated mode pins the runtime pool's PgSubscriber connection. Shared
  // exact mode uses a separate one-client notification pool, so max=1 remains
  // a valid runtime density arm.
  if (enableRealtime && realtimeNotificationMode === 'dedicated' && runtimePoolMax < 2) {
    throw new Error('CTF_REALTIME_REQUIRES_RUNTIME_POOL_MAX_2');
  }
  const notificationRole = realtimeNotificationMode === 'shared-exact'
    ? requireString(
      args,
      'notification-role',
      environment.CTF_NOTIFICATION_PGUSER,
    )
    : null;
  let notificationPasswordAvailable = realtimeNotificationMode === 'shared-exact'
    ? environment.CTF_NOTIFICATION_PGPASSWORD
    : null;
  if (
    realtimeNotificationMode === 'shared-exact'
    && (
      typeof notificationPasswordAvailable !== 'string'
      || notificationPasswordAvailable.length === 0
    )
  ) {
    throw new Error('CTF_NOTIFICATION_PASSWORD_REQUIRED');
  }
  if (notificationRole && new Set(Object.values(runtimeRoles)).has(notificationRole)) {
    throw new Error('CTF_NOTIFICATION_ROLE_MUST_BE_DISTINCT');
  }
  // Keep the listener credential out of the serializable options object. The
  // closure exposes exactly one read and cannot enumerate the surrounding
  // environment or any runtime-role credential.
  const takeNotificationPassword = () => {
    const value = notificationPasswordAvailable;
    notificationPasswordAvailable = null;
    if (realtimeNotificationMode === 'shared-exact' && !value) {
      throw new Error('CTF_NOTIFICATION_PASSWORD_ALREADY_CONSUMED');
    }
    return value;
  };
  return {
    host,
    port: parsePositiveInteger(args.port ?? '3391', 'port'),
    arm: requireString(args, 'arm', 'local-complete-tenant'),
    mode,
    introspectionClientReleaseMode,
    runtimePoolMax,
    runtimePoolMaxUses,
    preparedStatementCacheRequest:
      preparedStatementCacheRequestFromEnvironment(environment),
    enableRealtime,
    realtimeNotificationMode,
    notificationRole,
    takeNotificationPassword,
    realtimeCursorPollIntervalMs: parsePositiveInteger(
      args['realtime-cursor-poll-ms'] ?? '5000',
      'realtime-cursor-poll-ms',
    ),
    realtimeCursorHeartbeatIntervalMs: parsePositiveInteger(
      args['realtime-cursor-heartbeat-ms'] ?? '30000',
      'realtime-cursor-heartbeat-ms',
    ),
    runtimeRoles,
    controlToken: typeof environment.CTF_CONTROL_TOKEN === 'string'
      ? environment.CTF_CONTROL_TOKEN
      : '',
  };
};

const timingSafeTokenEqual = (candidate, expected) => {
  if (!candidate || !expected) return false;
  const actualBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length
    && crypto.timingSafeEqual(actualBytes, expectedBytes);
};

const bearerToken = (request) => {
  const value = request.get('authorization');
  return value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : '';
};

const isLoopbackRequest = (request) => {
  const address = request.socket?.remoteAddress ?? '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
};

const languageCodes = (request) => {
  const header = request.get('accept-language') ?? '';
  const parsed = header
    .split(',')
    .map((part) => part.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean)
    .map((part) => part.split('-')[0]);
  return [...new Set([...parsed, 'en'])].slice(0, 8);
};

const storageModuleFor = (tenant) => ({
  id: `30000000-0000-4000-8000-00000000000${tenant.id}`,
  bucketsQualifiedName: `"${tenant.schema}"."app_buckets"`,
  filesQualifiedName: `"${tenant.schema}"."app_files"`,
  schemaName: tenant.schema,
  bucketsTableName: 'app_buckets',
  filesTableName: 'app_files',
  scope: 'app',
  entityTableId: null,
  entityQualifiedName: null,
  endpoint: null,
  publicUrlPrefix: null,
  provider: 'minio',
  allowedOrigins: ['http://127.0.0.1'],
  uploadUrlExpirySeconds: 900,
  downloadUrlExpirySeconds: 3600,
  defaultMaxFileSize: 1024 * 1024,
  maxFilenameLength: 1024,
  cacheTtlSeconds: 300,
  hasPathShares: false,
  maxBulkFiles: 100,
  maxBulkTotalSize: 1024 * 1024,
});

const computeFor = (tenant) => {
  const module = {
    schemaName: tenant.schema,
    bindingsTableName: 'fixture_preloaded_bindings',
    definitionsTableName: 'fixture_preloaded_definitions',
    invocationsSchemaName: tenant.schema,
    invocationsTableName: 'function_invocations',
    invocationsEntityField: 'database_id',
  };
  return {
    modules: [module],
    bindings: [{
      bindingId: `50000000-0000-4000-8000-00000000000${tenant.id}`,
      alias: 'fixture_task',
      config: { graphql: true },
      functionDefinitionId: `60000000-0000-4000-8000-00000000000${tenant.id}`,
      taskIdentifier: `ctf.fixture.${tenant.id}`,
      description: 'Complete-tenant fixture task',
      payloadArgs: null,
      module,
    }],
  };
};

const pluginComputeFor = (compute) => ({
  modules: compute.modules.map((module) => ({
    computeSchema: module.schemaName,
    bindingsTable: module.bindingsTableName,
    definitionsTable: module.definitionsTableName,
    invocationsSchema: module.invocationsSchemaName,
    invocationsTable: module.invocationsTableName,
    invocationsEntityField: module.invocationsEntityField,
  })),
  bindings: compute.bindings.map((binding) => ({
    ...binding,
    module: {
      computeSchema: binding.module.schemaName,
      bindingsTable: binding.module.bindingsTableName,
      definitionsTable: binding.module.definitionsTableName,
      invocationsSchema: binding.module.invocationsSchemaName,
      invocationsTable: binding.module.invocationsTableName,
      invocationsEntityField: binding.module.invocationsEntityField,
    },
  })),
});

const deterministicLlmPlugin = () => ({
  // Downstream LLM plugins declare an ordering dependency on this canonical
  // name. The production module plugin is deliberately replaced because this
  // lane must not acquire an external provider during an offline run.
  name: 'LlmModulePlugin',
  version: '1.0.0',
  schema: {
    hooks: {
      build(build) {
        const embedder = async () => ({ embedding: [1, 0, 0], promptTokens: 5 });
        const chatCompleter = async (messages) => {
          const prompt = messages.find((message) => message.role === 'user')?.content ?? '';
          return {
            content: `Deterministic fixture answer: ${prompt}`,
            usage: {
              input: 10,
              output: 10,
              reasoning: 0,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 20,
            },
          };
        };
        return build.extend(build, {
          llmEmbedder: embedder,
          llmChatCompleter: chatCompleter,
          llmEmbeddingModel: 'ctf-deterministic-3d-v1',
          llmChatModel: 'ctf-deterministic-chat-v1',
        }, 'Complete-tenant deterministic LLM provider');
      },
    },
  },
});

const loadRuntime = () => {
  const express = require(path.join(REPO_ROOT, 'graphql/server/node_modules/express'));
  const { S3Client } = require(path.join(
    REPO_ROOT,
    'graphql/server/node_modules/@aws-sdk/client-s3',
  ));
  return {
    express,
    S3Client,
    ...requireBuilt('graphile/graphile-cache/dist/index.js'),
    realtimeSubscriptions: requireBuilt(
      'graphile/graphile-realtime-subscriptions/dist/index.js'
    ),
    graphileSettings: requireBuilt('graphile/graphile-settings/dist/index.js'),
    pgCacheApi: requireBuilt('postgres/pg-cache/dist/index.js'),
    expressContext: requireBuilt('packages/express-context/dist/index.js'),
    llm: requireBuilt('graphile/graphile-llm/dist/index.js'),
    functionBindings: requireBuilt('graphile/graphile-function-bindings/dist/index.js'),
    presigned: requireBuilt('graphile/graphile-presigned-url-plugin/dist/index.js'),
    authCookie: requireBuilt('graphql/server/dist/plugins/auth-cookie-plugin.js'),
    dataplanPgAdaptor: loadInstalledDataplanPgAdaptor(),
    pgEnv: require(path.join(REPO_ROOT, 'graphql/server/node_modules/pg-env')),
    buildContractApi: requireBuilt('graphql/server/dist/middleware/graphile-build-contract.js'),
    buildGovernor: requireBuilt('graphql/server/dist/middleware/graphile-build-governor.js'),
    roleSafety: requireBuilt('graphql/server/dist/middleware/runtime-role-safety.js'),
    buildStats: requireBuilt('graphql/server/dist/middleware/observability/graphile-build-stats.js'),
    debugMemory: requireBuilt('graphql/server/dist/diagnostics/debug-memory-snapshot.js'),
  };
};

const createFixtureServer = async (options, environment = process.env) => {
  const runtime = loadRuntime();
  const preparedStatementCache = await attestDataplanPreparedStatementCache(
    runtime.dataplanPgAdaptor,
    options.preparedStatementCacheRequest,
  );
  if (!preparedStatementCache.exact) {
    throw new Error('CTF_DATAPLAN_PREPARED_STATEMENT_CACHE_MISMATCH');
  }
  const {
    createGraphileInstance,
    deleteGraphileCacheEntry,
    disposeUncachedEntry,
    graphileCache,
    invokeEntryHandler,
    invokeEntryUpgradeHandler,
    prepareCacheForBuild,
    getGraphileRealtimeRoleAuditStats,
    revalidateEntryRealtimeRole,
  } = runtime;
  const {
    acquirePgPool,
    getPgNotificationBrokerIdentity,
    getPgNotificationBrokerStats,
    getPgPoolIdentity,
    pgCache,
    teardownPgNotificationBrokers,
    teardownPgPools,
  } = runtime.pgCacheApi;
  const { createGraphileBuildContract, hashGraphileBuildContract } = runtime.buildContractApi;
  const { runGraphileBuild, getGraphileGovernorCounters } = runtime.buildGovernor;
  const { ensureRuntimeRoleSafety, invalidateRuntimeRoleSafety } = runtime.roleSafety;
  const { observeGraphileBuild, getGraphileBuildStats } = runtime.buildStats;
  const { getDebugMemorySnapshot } = runtime.debugMemory;
  const { buildPgSettings } = runtime.expressContext;
  const {
    createConstructivePreset,
    createGrafastCacheLimitsPreset,
    makePgService,
  } = runtime.graphileSettings;
  const {
    createLlmRagPlugin,
    createLlmTextMutationPlugin,
    createLlmTextSearchPlugin,
  } = runtime.llm;
  const { createFunctionBindingsPlugin } = runtime.functionBindings;
  const { PresignedUrlPreset } = runtime.presigned;
  const { AuthCookiePlugin } = runtime.authCookie;
  const {
    ActivatableGenerationScopedRealtimeSubscriber,
    RealtimeTopicCollector,
  } = runtime.realtimeSubscriptions;

  const controlPgConfig = {
    ...runtime.pgEnv.getPgEnvOptions({}),
    // Control-plane queries are trusted and short-lived. Keep their pool shape
    // constant so runtime-pool experiments cannot alter the measured baseline.
    pool: { max: CONTROL_POOL_MAX, maxUses: 0 },
  };
  const runtimeFingerprint = runtimeArtifactFingerprint();
  const configurationIdentity = fixtureConfigurationIdentity({
    databaseName: controlPgConfig.database,
    mode: options.mode,
    introspectionClientReleaseMode: options.introspectionClientReleaseMode,
    enableRealtime: options.enableRealtime,
    realtimeNotificationMode: options.realtimeNotificationMode,
    realtimeCursorPollIntervalMs: options.realtimeCursorPollIntervalMs,
    realtimeCursorHeartbeatIntervalMs:
      options.realtimeCursorHeartbeatIntervalMs,
    runtimeFingerprint,
  });
  if (!/^graphile-configuration:ctf:v1:[a-f0-9]{64}$/.test(configurationIdentity)) {
    throw new Error('CTF_CONFIGURATION_IDENTITY_INVALID');
  }
  const runtimePoolOptions = { purpose: 'runtime', sanitizeOnCheckout: true };
  const notificationPassword = options.realtimeNotificationMode === 'shared-exact'
    ? options.takeNotificationPassword()
    : null;
  const notificationPgConfig = options.realtimeNotificationMode === 'shared-exact'
    ? {
      host: controlPgConfig.host,
      port: controlPgConfig.port,
      database: controlPgConfig.database,
      user: options.notificationRole,
      password: notificationPassword,
      // The notification broker is long-lived and must never inherit the
      // runtime-only single-checkout experiment from process environment.
      pool: { max: 1, maxUses: 0 },
    }
    : null;
  const realtimeListenerIdentity = notificationPgConfig
    ? getPgNotificationBrokerIdentity(notificationPgConfig)
    : null;
  const realtimeListenerContractEvidence = notificationPgConfig
    ? runtimePoolContractEvidence({
      databaseName: controlPgConfig.database,
      role: options.notificationRole,
      poolMax: 1,
      poolMaxUses: null,
      runtimeFingerprint,
      purpose: 'notification-listener',
      sanitizeOnCheckout: false,
    })
    : null;
  const expectedProvisionAttestation = validateExpectedProvisionAttestation(
    options.provisionAttestation,
    options.provisionCustomerId,
    controlPgConfig.database,
  );
  if (
    expectedProvisionAttestation
    && (
      options.runPurpose !== expectedProvisionAttestation.purpose
      || options.cloneId !== expectedProvisionAttestation.cloneId
    )
  ) {
    throw new Error('CTF_PROVISION_ATTESTATION_RUN_MISMATCH');
  }
  const hostileControlEnabled = hostileControlEnabledFor(
    options.runPurpose,
    expectedProvisionAttestation,
  );
  const tenantState = new Map();
  const buildContractEvidenceByLiveIdentity = new Map();

  for (const tenant of TENANTS) {
    const role = options.runtimeRoles[tenant.id];
    const password = environment[tenant.runtimePasswordEnvironment]
      ?? environment.GRAPHQL_RUNTIME_PGPASSWORD;
    const pgConfig = {
      host: controlPgConfig.host,
      port: controlPgConfig.port,
      database: controlPgConfig.database,
      user: role,
      password,
      pool: {
        max: options.runtimePoolMax,
        // An explicit zero is pg-cache's unlimited sentinel and prevents an
        // ambient PG_POOL_MAX_USES value from contaminating the baseline arm.
        maxUses: options.runtimePoolMaxUses ?? 0,
      },
    };
    const poolIdentity = getPgPoolIdentity(pgConfig, runtimePoolOptions);
    const poolContractEvidence = runtimePoolContractEvidence({
      databaseName: controlPgConfig.database,
      role,
      poolMax: options.runtimePoolMax,
      poolMaxUses: options.runtimePoolMaxUses,
      runtimeFingerprint,
    });
    const storage = { modules: [storageModuleFor(tenant)] };
    const compute = computeFor(tenant);
    const realtimeSchema = realtimeSchemaFor(tenant);
    const runtimeDependencySchemas = runtimeDependencySchemasFor(
      tenant,
      options.enableRealtime,
    );
    const contractInput = {
      configurationIdentity,
      poolIdentity,
      databaseId: tenant.databaseId,
      databaseName: controlPgConfig.database,
      apiId: tenant.apiId,
      schemas: [tenant.schema],
      authenticatedRole: role,
      anonymousRole: role,
      pluginSettings: FEATURE_SETTINGS,
      graphileSettings: {
        releaseBuildStateAfterValidation: RELEASE_BUILD_STATE_AFTER_VALIDATION,
        introspectionMode: options.mode,
        introspectionClientReleaseMode: options.introspectionClientReleaseMode,
        introspectionDependencySchemas: [...INTROSPECTION_DEPENDENCY_SCHEMAS],
        grafastCache: GRAFAST_CACHE_LIMITS,
        realtimeNotificationMode: options.realtimeNotificationMode,
        realtimeCursorPollIntervalMs: options.realtimeCursorPollIntervalMs,
        realtimeCursorHeartbeatIntervalMs:
          options.realtimeCursorHeartbeatIntervalMs,
        fixturePluginConfiguration: {
          authCookie: true,
          llmProvider: 'deterministic-3d-v1',
          storageProvider: 'offline-signing-only-v1',
          functionBindings: 'preloaded-v1',
          runtimeFingerprint,
        },
      },
      compute,
      storage,
      isPublic: false,
      // The complete-tenant lane defaults this off and delegates delivery to
      // the mandatory graphql-ws integration suite. Physical-database research
      // lanes may opt in after provisioning the required realtime cursor schema.
      enableRealtime: options.enableRealtime,
      realtimeSchema,
      realtimeNotificationMode: options.realtimeNotificationMode,
      realtimeListenerPoolIdentity: realtimeListenerIdentity ?? undefined,
      realtimeNotificationRoleRevalidationMs: 60_000,
      realtimeCursorPollIntervalMs: options.realtimeCursorPollIntervalMs,
      realtimeCursorHeartbeatIntervalMs:
        options.realtimeCursorHeartbeatIntervalMs,
      graphiql: false,
      graphiqlOnGraphQLGET: false,
      explain: false,
      introspectionMode: options.mode,
      introspectionClientReleaseMode: options.introspectionClientReleaseMode,
    };
    const contract = createGraphileBuildContract(contractInput);
    const evidenceContract = createGraphileBuildContract({
      ...contractInput,
      poolIdentity: poolContractEvidence.fingerprint,
      realtimeListenerPoolIdentity: realtimeListenerContractEvidence?.fingerprint,
    });
    const buildContractEvidence = credentialFreeContractEvidence(
      'graphile-contract-evidence',
      evidenceContract,
    );
    if (
      contract.surface.graphiql !== false
      || contract.surface.graphiqlOnGraphQLGET !== false
      || contract.surface.realtimeSchema !== (options.enableRealtime ? realtimeSchema : null)
      || contract.surface.realtimeNotificationMode
        !== (options.enableRealtime ? options.realtimeNotificationMode : null)
      || contract.surface.realtimeListenerPoolIdentity
        !== (options.enableRealtime && options.realtimeNotificationMode === 'shared-exact'
          ? realtimeListenerIdentity
          : null)
    ) {
      throw new Error('CTF_BUILD_CONTRACT_SURFACE_FLAGS_UNSUPPORTED');
    }
    const cacheKey = hashGraphileBuildContract(contract);
    buildContractEvidenceByLiveIdentity.set(
      cacheKey,
      buildContractEvidence.fingerprint,
    );
    tenantState.set(tenant.id, {
      tenant,
      role,
      pgConfig,
      poolIdentity,
      storage,
      compute,
      realtimeSchema,
      runtimeDependencySchemas,
      realtimeListenerIdentity,
      poolContractEvidence,
      buildContractEvidence,
      cacheKey,
    });
  }

  const runtimePoolStats = () => makeRuntimePoolStats(
    pgCache,
    TENANTS.map((tenant) => tenantState.get(tenant.id).poolIdentity),
    options.runtimePoolMaxUses,
  );
  const runtimePoolObjects = () => TENANTS.map((tenant) => {
    const identity = tenantState.get(tenant.id).poolIdentity;
    return pgCache.records instanceof Map
      ? pgCache.records.get(identity)?.pool ?? null
      : null;
  });

  let activeBuilds = 0;
  let maxConcurrentBuilds = 0;
  const buildCounts = Object.fromEntries(TENANTS.map((tenant) => [tenant.id, 0]));
  const buildGenerations = Object.fromEntries(TENANTS.map((tenant) => [tenant.id, 0]));
  const inFlight = new Map();

  const withLease = async (pgConfig, poolOptions, callback) => {
    const lease = acquirePgPool(pgConfig, poolOptions);
    try {
      return await callback(lease.pool);
    } finally {
      lease.release();
    }
  };

  const readProvisionAttestation = async () => {
    if (!expectedProvisionAttestation) return null;
    const result = await withLease(
      controlPgConfig,
      { purpose: 'control', sanitizeOnCheckout: false },
      (pool) => pool.query(`
        SELECT clone_id,
               run_purpose,
               customer_id,
               attestation_nonce,
               attestation_sha256,
               pg_catalog.current_database()::text AS database
        FROM ctf_provision_private.clone_attestation
        WHERE singleton = true
      `),
    );
    if (result.rowCount !== 1) throw new Error('CTF_PROVISION_ATTESTATION_ROW_INVALID');
    const row = result.rows[0];
    if (
      typeof row.clone_id !== 'string'
      || !/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(row.clone_id)
      || (row.run_purpose !== 'hostile-preflight' && row.run_purpose !== 'measurement')
      || typeof row.customer_id !== 'string'
      || !/^[a-z0-9-]+$/.test(row.customer_id)
      || typeof row.database !== 'string'
      || typeof row.attestation_nonce !== 'string'
      || !/^[a-f0-9]{64}$/.test(row.attestation_nonce)
      || !/^sha256:[a-f0-9]{64}$/.test(row.attestation_sha256 ?? '')
    ) {
      throw new Error('CTF_PROVISION_ATTESTATION_ROW_INVALID');
    }
    const calculatedSha256 = provisionAttestationSha256({
      cloneId: row.clone_id,
      purpose: row.run_purpose,
      customerId: row.customer_id,
      database: row.database,
      nonce: row.attestation_nonce,
    });
    if (
      row.clone_id !== expectedProvisionAttestation.cloneId
      || row.run_purpose !== expectedProvisionAttestation.purpose
      || row.customer_id !== options.provisionCustomerId
      || row.database !== controlPgConfig.database
      || row.attestation_sha256 !== expectedProvisionAttestation.sha256
      || calculatedSha256 !== row.attestation_sha256
    ) {
      throw new Error('CTF_PROVISION_ATTESTATION_MISMATCH');
    }
    return {
      version: 1,
      cloneId: row.clone_id,
      purpose: row.run_purpose,
      customerId: row.customer_id,
      database: row.database,
      sha256: calculatedSha256,
      verified: true,
    };
  };

  // Refuse to publish any physical fixture until its opaque database nonce has
  // been queried and matched to the credential-free manifest digest.
  const initialProvisionAttestation = await readProvisionAttestation();

  await Promise.all(TENANTS.map(async (tenant) => {
    const state = tenantState.get(tenant.id);
    await withLease(state.pgConfig, runtimePoolOptions, (pool) =>
      ensureRuntimeRoleSafety(
        pool,
        [state.role],
        [tenant.schema],
        state.runtimeDependencySchemas,
      )
    );
  }));

  const s3Client = new runtime.S3Client({
    endpoint: 'http://127.0.0.1:9',
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'ctf-offline-signing-only',
      secretAccessKey: 'ctf-offline-signing-only',
    },
  });

  const makePreset = (state, pool, sharedRealtimeBuild = null) => {
    const pluginCompute = pluginComputeFor(state.compute);
    return {
      extends: [
        createConstructivePreset({
          ...FEATURE_SETTINGS,
          enableLlm: false,
          enablePresignedUploads: false,
          preloadedStorageModules: [],
          ...(sharedRealtimeBuild ? {
            realtimeSubscriptions: {
              onTopicsDiscovered: sharedRealtimeBuild.topicCollector.collect,
            },
          } : {}),
        }),
        PresignedUrlPreset({
          s3: {
            client: s3Client,
            bucket: `ctf-${state.tenant.id}-offline`,
            endpoint: 'http://127.0.0.1:9',
            region: 'us-east-1',
            forcePathStyle: true,
          },
          preloadedStorageModules: state.storage.modules,
        }),
        createGrafastCacheLimitsPreset(GRAFAST_CACHE_LIMITS),
      ],
      plugins: [
        AuthCookiePlugin,
        deterministicLlmPlugin(),
        createLlmTextSearchPlugin({ onQuotaExceeded: 'throw' }),
        createLlmTextMutationPlugin(),
        createLlmRagPlugin({ contextLimit: 2, maxTokens: 256 }),
        createFunctionBindingsPlugin({
          apiId: state.tenant.apiId,
          modules: pluginCompute.modules,
          preloadedBindings: pluginCompute.bindings,
        }),
      ],
      pgServices: [makePgService({
        pool,
        schemas: [state.tenant.schema],
        introspectionMode: options.mode,
        introspectionClientReleaseMode: options.introspectionClientReleaseMode,
        introspectionScopedCatalogTypes: options.mode === 'scoped-required'
          ? 'dependency-closure'
          : undefined,
        introspectionAllowedDependencySchemas: [...INTROSPECTION_DEPENDENCY_SCHEMAS],
        ...(sharedRealtimeBuild ? {
          pubsub: false,
          pgSubscriber: sharedRealtimeBuild.subscriber,
        } : {}),
      })],
      schema: {
        releaseBuildStateAfterValidation: RELEASE_BUILD_STATE_AFTER_VALIDATION,
      },
      grafserv: {
        graphqlPath: '/graphql',
        graphiql: false,
        graphiqlOnGraphQLGET: false,
        websockets: options.enableRealtime,
      },
      grafast: {
        explain: false,
        context: (requestContext) => {
          const request = requestContext?.expressv4?.req;
          const api = request?.api ?? {
            dbname: controlPgConfig.database,
            schema: [state.tenant.schema],
            anonRole: state.role,
            roleName: state.role,
            databaseId: state.tenant.databaseId,
            apiId: state.tenant.apiId,
            isPublic: false,
          };
          return {
            pgSettings: buildPgSettings({
              api,
              token: null,
              requestId: request?.requestId ?? crypto.randomUUID(),
              dependencySchemas: [...INTROSPECTION_DEPENDENCY_SCHEMAS],
            }),
            langCodes: request ? languageCodes(request) : ['es', 'en'],
          };
        },
      },
    };
  };

  const buildEntry = (state) => {
    const resident = graphileCache.get(state.cacheKey);
    if (resident && !resident.disposing) return Promise.resolve(resident);
    const existing = inFlight.get(state.cacheKey);
    if (existing) return existing;

    const buildGeneration = buildGenerations[state.tenant.id];
    const pending = runGraphileBuild(async () => {
      await prepareCacheForBuild();
      const lease = acquirePgPool(state.pgConfig, runtimePoolOptions);
      let entry = null;
      let leaseOwnedByEntry = false;
      const sharedRealtimeBuild = options.realtimeNotificationMode === 'shared-exact'
        ? {
          subscriber: new ActivatableGenerationScopedRealtimeSubscriber(),
          topicCollector: new RealtimeTopicCollector(),
        }
        : null;
      let sharedRealtimeOwnedByEntry = false;
      activeBuilds += 1;
      maxConcurrentBuilds = Math.max(maxConcurrentBuilds, activeBuilds);
      buildCounts[state.tenant.id] += 1;
      try {
        await ensureRuntimeRoleSafety(
          lease.pool,
          [state.role],
          [state.tenant.schema],
          state.runtimeDependencySchemas,
        );
        entry = await observeGraphileBuild({
          cacheKey: state.cacheKey,
          serviceKey: `ctf-${state.tenant.id}-api`,
          databaseId: state.tenant.databaseId,
        }, () => createGraphileInstance({
          preset: makePreset(state, lease.pool, sharedRealtimeBuild),
          cacheKey: state.cacheKey,
          poolIdentity: state.poolIdentity,
          poolLease: lease,
          serviceKey: `ctf-${state.tenant.id}-api`,
          databaseId: state.tenant.databaseId,
          enableRealtime: options.enableRealtime,
          enableWebsockets: options.enableRealtime,
          realtimeSchema: state.realtimeSchema,
          realtimeSourceSchemas: [state.tenant.schema],
          realtimeCursorPollIntervalMs: options.realtimeCursorPollIntervalMs,
          realtimeCursorHeartbeatIntervalMs:
            options.realtimeCursorHeartbeatIntervalMs,
          ...(sharedRealtimeBuild && notificationPgConfig && realtimeListenerIdentity ? {
            sharedRealtime: {
              ...sharedRealtimeBuild,
              listenerPgConfig: notificationPgConfig,
              listenerIdentity: realtimeListenerIdentity,
              roleRevalidationMs: 60_000,
            },
          } : {}),
        }), { enabled: true });
        sharedRealtimeOwnedByEntry = Boolean(sharedRealtimeBuild);
        leaseOwnedByEntry = true;
        if (buildGeneration !== buildGenerations[state.tenant.id]) {
          throw new Error(`CTF_BUILD_INVALIDATED:${state.tenant.id}`);
        }
        graphileCache.set(state.cacheKey, entry);
        if (graphileCache.get(state.cacheKey) !== entry) {
          throw new Error(`CTF_CACHE_PUBLICATION_FAILED:${state.tenant.id}`);
        }
        return entry;
      } catch (error) {
        if (leaseOwnedByEntry && entry) {
          await disposeUncachedEntry(entry, state.cacheKey).catch(() => undefined);
        } else {
          lease.release();
        }
        throw error;
      } finally {
        if (sharedRealtimeBuild && !sharedRealtimeOwnedByEntry) {
          await sharedRealtimeBuild.subscriber.release().catch(() => undefined);
        }
        activeBuilds -= 1;
      }
    });
    inFlight.set(state.cacheKey, pending);
    void pending.finally(() => {
      if (inFlight.get(state.cacheKey) === pending) inFlight.delete(state.cacheKey);
    }).catch(() => undefined);
    return pending;
  };

  const invalidateTenant = async (tenantId) => {
    const state = tenantState.get(tenantId);
    if (!state) throw new Error(`CTF_UNKNOWN_TENANT:${tenantId}`);
    buildGenerations[tenantId] += 1;
    const pending = inFlight.get(state.cacheKey);
    if (pending) await pending.catch(() => undefined);
    const lease = acquirePgPool(state.pgConfig, runtimePoolOptions);
    invalidateRuntimeRoleSafety(lease.pool);
    lease.release();
    await deleteGraphileCacheEntry(state.cacheKey);
  };

  const handleUpgrade = async (request, socket, head, { pathPrefix = '' } = {}) => {
    if (!options.enableRealtime || request.aborted || socket.destroyed) return false;
    const tenantId = matchTenantUpgradePath(request.url, pathPrefix);
    if (!tenantId) return false;
    const state = tenantState.get(tenantId);
    if (!state) return false;
    const protocols = String(request.headers['sec-websocket-protocol'] ?? '')
      .split(',')
      .map((value) => value.trim());
    if (!protocols.includes('graphql-transport-ws')) return false;

    request.api = {
      apiId: state.tenant.apiId,
      databaseId: state.tenant.databaseId,
      dbname: controlPgConfig.database,
      schema: [state.tenant.schema],
      anonRole: state.role,
      roleName: state.role,
      isPublic: false,
      databaseSettings: FEATURE_SETTINGS,
    };
    request.token = null;
    request.requestId = request.headers['x-request-id'] ?? crypto.randomUUID();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const entry = graphileCache.get(state.cacheKey) ?? await buildEntry(state);
      await ensureRuntimeRoleSafety(
        entry.poolLease.pool,
        [state.role],
        [state.tenant.schema],
        state.runtimeDependencySchemas,
      );
      await revalidateEntryRealtimeRole(entry);
      if (invokeEntryUpgradeHandler(entry, request, socket, head)) return true;
      if (request.aborted || socket.destroyed) return true;
    }
    return false;
  };

  const app = runtime.express();
  app.disable('x-powered-by');
  app.use(runtime.express.json({ limit: '256kb' }));

  app.get('/healthz', (_request, response) => {
    const governor = getGraphileGovernorCounters();
    response.status(governor.restartRequired ? 503 : 200).json({
      status: governor.restartRequired ? 'unhealthy' : 'ok',
    });
  });

  app.get('/debug/memory', (request, response) => {
    if (!isLoopbackRequest(request)) {
      response.status(404).send('Not found');
      return;
    }
    const configuredToken = environment.GRAPHQL_OBSERVABILITY_TOKEN ?? '';
    if (
      environment.NODE_ENV !== 'development'
      && !timingSafeTokenEqual(bearerToken(request), configuredToken)
    ) {
      response.status(401).json({ error: { code: 'CTF_OBSERVABILITY_UNAUTHORIZED' } });
      return;
    }
    response.json(getDebugMemorySnapshot());
  });

  app.get('/__ctf/status', async (request, response, next) => {
    if (!isLoopbackRequest(request)) {
      response.status(404).send('Not found');
      return;
    }
    try {
      const liveProvisionAttestation = await readProvisionAttestation();
      response.json({
        version: 1,
        fixture: 'complete-tenant-abc-v1',
        arm: options.arm,
        introspectionMode: options.mode,
        introspectionClientReleaseMode: options.introspectionClientReleaseMode,
        releaseBuildStateAfterValidation: RELEASE_BUILD_STATE_AFTER_VALIDATION,
        runtimeArtifactFingerprint: runtimeFingerprint,
        configurationIdentity,
        liveIdentityScope: 'process-local-keyed-hmac-v1',
        physicalIsolation: 'dedicated-login-and-pool-per-tenant',
        sharedRuntimePool: false,
        runtimePoolMax: options.runtimePoolMax,
        runtimePoolMaxUses: options.runtimePoolMaxUses,
        runtimePools: runtimePoolStats(),
        preparedStatementCache,
        enableRealtime: options.enableRealtime,
        realtimeNotificationMode: options.realtimeNotificationMode,
        realtimeListenerIdentity,
        realtimeCursorPollIntervalMs: options.realtimeCursorPollIntervalMs,
        realtimeCursorHeartbeatIntervalMs:
          options.realtimeCursorHeartbeatIntervalMs,
        realtimeNotificationBrokers: getPgNotificationBrokerStats(),
        realtimeRoleAudits: getGraphileRealtimeRoleAuditStats(),
        realtimeSchemas: Object.fromEntries(TENANTS.map((tenant) => [
          tenant.id,
          tenantState.get(tenant.id).realtimeSchema,
        ])),
        physicalDatabase: controlPgConfig.database,
        runPurpose: options.runPurpose ?? null,
        provisionAttestation: liveProvisionAttestation,
        runtimePoolIdentities: Object.fromEntries(TENANTS.map((tenant) => [
          tenant.id,
          tenantState.get(tenant.id).poolIdentity,
        ])),
        runtimeBindings: Object.fromEntries(TENANTS.map((tenant) => [
          tenant.id,
          {
            databaseId: tenant.databaseId,
            databaseName: controlPgConfig.database,
            role: tenantState.get(tenant.id).role,
            schemas: [tenant.schema],
          },
        ])),
        controlAvailable: hostileControlEnabled
          && Buffer.byteLength(options.controlToken) >= 32,
        buildContracts: Object.fromEntries(TENANTS.map((tenant) => [
          tenant.id,
          tenantState.get(tenant.id).cacheKey,
        ])),
        residentBuildContracts: [...graphileCache.keys()],
        contractEvidence: {
          version: 1,
          credentialFree: true,
          configurationIdentity,
          realtimeListener: realtimeListenerContractEvidence,
          runtimePools: Object.fromEntries(TENANTS.map((tenant) => [
            tenant.id,
            tenantState.get(tenant.id).poolContractEvidence,
          ])),
          graphileBuilds: Object.fromEntries(TENANTS.map((tenant) => [
            tenant.id,
            tenantState.get(tenant.id).buildContractEvidence,
          ])),
          residentGraphileBuildFingerprints: [...graphileCache.keys()]
            .map((cacheKey) => buildContractEvidenceByLiveIdentity.get(cacheKey))
            .filter(Boolean),
        },
        builds: {
          active: activeBuilds,
          maxConcurrent: maxConcurrentBuilds,
          byTenant: { ...buildCounts },
          generations: { ...buildGenerations },
          inFlight: [...inFlight.keys()],
          graphile: getGraphileBuildStats(),
        },
        runtimeSafety: {
          passed: true,
          rolesDistinct: true,
          dependencySchemasByTenant: Object.fromEntries(TENANTS.map((tenant) => [
            tenant.id,
            tenantState.get(tenant.id).runtimeDependencySchemas,
          ])),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/__ctf/control', async (request, response, next) => {
    try {
      if (!hostileControlEnabled) {
        response.status(404).send('Not found');
        return;
      }
      if (
        !isLoopbackRequest(request)
        || Buffer.byteLength(options.controlToken) < 32
        || !timingSafeTokenEqual(bearerToken(request), options.controlToken)
      ) {
        response.status(404).send('Not found');
        return;
      }
      const action = request.body?.action;
      const tenantId = request.body?.tenant;
      if (action === 'invalidate-all') {
        await Promise.all(TENANTS.map((tenant) => invalidateTenant(tenant.id)));
        const identity = await withLease(
          controlPgConfig,
          { purpose: 'control', sanitizeOnCheckout: false },
          (pool) => pool.query(
            'SELECT pg_catalog.current_database()::text AS physical_database_identity',
          ),
        );
        response.json({
          ok: true,
          action,
          physicalDatabaseIdentity: identity.rows[0]?.physical_database_identity,
        });
        return;
      }
      const state = tenantState.get(tenantId);
      if (!state) {
        response.status(400).json({ error: { code: 'CTF_UNKNOWN_TENANT' } });
        return;
      }
      if (action === 'poison') {
        const observed = await withLease(state.pgConfig, runtimePoolOptions, async (pool) => {
          const client = await pool.connect();
          try {
            const result = await client.query(
              `SELECT ${state.tenant.schema}.poison_session() AS value, `
              + 'pg_catalog.current_database()::text AS physical_database_identity',
            );
            return result.rows[0];
          } finally {
            client.release();
          }
        });
        response.json({
          ok: observed?.value === 'poisoned',
          action,
          tenant: tenantId,
          physicalDatabaseIdentity: observed?.physical_database_identity,
        });
        return;
      }
      if (action === 'rollback-savepoint') {
        const observed = await withLease(state.pgConfig, runtimePoolOptions, async (pool) => {
          const client = await pool.connect();
          try {
            await client.query('SELECT pg_catalog.set_config($1, $2, false)', [
              'jwt.claims.database_id',
              state.tenant.databaseId,
            ]);
            const result = await client.query(
              `SELECT ${state.tenant.schema}.savepoint_identity() AS value, `
              + 'pg_catalog.current_database()::text AS physical_database_identity',
            );
            return result.rows[0];
          } finally {
            client.release();
          }
        });
        response.json({
          ok: observed?.value === state.tenant.databaseId,
          action,
          tenant: tenantId,
          observed: observed?.value,
          physicalDatabaseIdentity: observed?.physical_database_identity,
        });
        return;
      }
      if (action === 'prepared-reset') {
        const statementName = `ctf-prepared-reset-${tenantId}`;
        const first = await withLease(state.pgConfig, runtimePoolOptions, async (pool) => {
          const client = await pool.connect();
          try {
            await client.query('SELECT pg_catalog.set_config($1, $2, false)', [
              'jwt.claims.database_id',
              state.tenant.databaseId,
            ]);
            const result = await client.query({
              name: statementName,
              text: `SELECT ${state.tenant.schema}.tenant_identity() AS value, `
                + 'pg_catalog.current_database()::text AS physical_database_identity, '
                + 'pg_catalog.pg_backend_pid()::integer AS backend_pid, '
                + 'current_user::text AS runtime_role',
            });
            return result.rows[0];
          } finally {
            client.release();
          }
        });
        const second = await withLease(state.pgConfig, runtimePoolOptions, async (pool) => {
          const client = await pool.connect();
          try {
            await client.query('SELECT pg_catalog.set_config($1, $2, false)', [
              'jwt.claims.database_id',
              state.tenant.databaseId,
            ]);
            const result = await client.query({
              name: statementName,
              text: `SELECT ${state.tenant.schema}.request_identity() AS value, `
                + 'pg_catalog.current_database()::text AS physical_database_identity, '
                + 'pg_catalog.pg_backend_pid()::integer AS backend_pid, '
                + 'current_user::text AS runtime_role',
            });
            return result.rows[0];
          } finally {
            client.release();
          }
        });
        const backend = preparedResetBackendEvidence(
          first?.backend_pid,
          second?.backend_pid,
          options.runtimePoolMaxUses,
        );
        response.json({
          ok: backend.exact
            && first?.value === state.tenant.token
            && second?.value === `${state.tenant.token}:${state.tenant.databaseId}`
            && first?.physical_database_identity === second?.physical_database_identity
            && first?.runtime_role === state.role
            && second?.runtime_role === state.role,
          action,
          tenant: tenantId,
          first: first?.value,
          second: second?.value,
          runtimeRole: first?.runtime_role,
          backend,
          physicalDatabaseIdentity: first?.physical_database_identity,
        });
        return;
      }
      if (action === 'bad-role-expected-failure') {
        const controlIdentity = await withLease(
          controlPgConfig,
          { purpose: 'control', sanitizeOnCheckout: false },
          (pool) => pool.query(
            'SELECT current_user::text AS role_name, '
            + 'pg_catalog.current_database()::text AS physical_database_identity',
          ),
        );
        let rejectedCode = null;
        try {
          await withLease(state.pgConfig, runtimePoolOptions, (pool) =>
            ensureRuntimeRoleSafety(
              pool,
              [state.role, controlIdentity.rows[0]?.role_name],
              [state.tenant.schema],
              state.runtimeDependencySchemas,
            )
          );
        } catch (error) {
          if (error?.code !== 'GRAPHILE_UNSAFE_RUNTIME_ROLE') throw error;
          rejectedCode = error.code;
        }
        response.json({
          ok: rejectedCode === 'GRAPHILE_UNSAFE_RUNTIME_ROLE',
          action,
          tenant: tenantId,
          rejectedCode,
          physicalDatabaseIdentity:
            controlIdentity.rows[0]?.physical_database_identity,
        });
        return;
      }
      if (action === 'drift-apply' || action === 'drift-revert') {
        const functionName = action === 'drift-apply'
          ? 'apply_schema_drift'
          : 'revert_schema_drift';
        const result = await withLease(
          controlPgConfig,
          { purpose: 'control', sanitizeOnCheckout: false },
          (pool) => pool.query(
            `SELECT ctf_control.${functionName}($1), `
            + 'pg_catalog.current_database()::text AS physical_database_identity',
            [state.tenant.schema],
          ),
        );
        await invalidateTenant(tenantId);
        response.json({
          ok: true,
          action,
          tenant: tenantId,
          physicalDatabaseIdentity:
            result.rows[0]?.physical_database_identity,
        });
        return;
      }
      response.status(400).json({ error: { code: 'CTF_UNKNOWN_CONTROL_ACTION' } });
    } catch (error) {
      next(error);
    }
  });

  for (const tenant of TENANTS) {
    const state = tenantState.get(tenant.id);
    app.use(`/tenant/${tenant.id}`, async (request, response, next) => {
      try {
        request.api = {
          apiId: tenant.apiId,
          databaseId: tenant.databaseId,
          dbname: controlPgConfig.database,
          schema: [tenant.schema],
          anonRole: state.role,
          roleName: state.role,
          isPublic: false,
          databaseSettings: FEATURE_SETTINGS,
        };
        request.token = null;
        request.requestId = request.get('x-request-id') ?? crypto.randomUUID();
        const entry = graphileCache.get(state.cacheKey) ?? await buildEntry(state);
        await ensureRuntimeRoleSafety(
          entry.poolLease.pool,
          [state.role],
          [tenant.schema],
          state.runtimeDependencySchemas,
        );
        await revalidateEntryRealtimeRole(entry);
        if (!invokeEntryHandler(entry, request, response, next) && !response.headersSent) {
          response.status(503).json({ error: { code: 'CTF_INSTANCE_ROTATING' } });
        }
      } catch (error) {
        next(error);
      }
    });
  }

  app.use((error, _request, response, _next) => {
    const code = typeof error?.code === 'string' ? error.code : 'CTF_INTERNAL_ERROR';
    response.status(code === 'GRAPHILE_UNSAFE_RUNTIME_ROLE' ? 503 : 500).json({
      error: { code, message: error instanceof Error ? error.message : String(error) },
    });
  });

  let httpServer = null;
  let upgradeListener = null;
  const listen = () => new Promise((resolve, reject) => {
    httpServer = app.listen(options.port, options.host, () => resolve(httpServer));
    httpServer.once('error', reject);
    if (options.enableRealtime) {
      upgradeListener = (request, socket, head) => {
        void handleUpgrade(request, socket, head)
          .then((handled) => {
            if (!handled && !socket.destroyed) socket.destroy();
          })
          .catch(() => socket.destroy());
      };
      httpServer.on('upgrade', upgradeListener);
    }
  });
  const close = async () => {
    if (httpServer && upgradeListener) httpServer.off('upgrade', upgradeListener);
    const closeServer = httpServer?.listening
      ? new Promise((resolve) => httpServer.close(resolve))
      : Promise.resolve();
    await Promise.all(TENANTS.map((tenant) =>
      deleteGraphileCacheEntry(tenantState.get(tenant.id).cacheKey)
    ));
    await closeServer;
    await teardownPgNotificationBrokers();
    await teardownPgPools();
  };

  return {
    app,
    close,
    handleUpgrade,
    initialProvisionAttestation,
    listen,
    options: {
      host: options.host,
      port: options.port,
      arm: options.arm,
      mode: options.mode,
      runtimeRoles: { ...options.runtimeRoles },
    },
    readProvisionAttestation,
    contractEvidence: () => ({
      version: 1,
      credentialFree: true,
      configurationIdentity,
      realtimeListener: realtimeListenerContractEvidence,
      runtimePools: Object.fromEntries(TENANTS.map((tenant) => [
        tenant.id,
        tenantState.get(tenant.id).poolContractEvidence,
      ])),
      graphileBuilds: Object.fromEntries(TENANTS.map((tenant) => [
        tenant.id,
        tenantState.get(tenant.id).buildContractEvidence,
      ])),
    }),
    buildContractFingerprintForLiveIdentity: (cacheKey) =>
      buildContractEvidenceByLiveIdentity.get(cacheKey) ?? null,
    runtimePoolObjects,
    runtimePoolStats,
  };
};

const main = async () => {
  const options = parseServerOptions(process.argv.slice(2));
  const server = await createFixtureServer(options);
  await server.listen();
  process.stdout.write(
    `${JSON.stringify({ status: 'ready', host: options.host, port: options.port, arm: options.arm })}\n`,
  );
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await server.close();
  };
  process.once('SIGTERM', () => void shutdown().finally(() => process.exit(0)));
  process.once('SIGINT', () => void shutdown().finally(() => process.exit(130)));
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  FEATURE_SETTINGS,
  GRAFAST_CACHE_LIMITS,
  INSTALLED_RUNTIME_ARTIFACT_SPECS,
  INTROSPECTION_DEPENDENCY_SCHEMAS,
  PREPARED_STATEMENT_ATTESTATION_KIND,
  RELEASE_BUILD_STATE_AFTER_VALIDATION,
  RUNTIME_ARTIFACT_PATHS,
  RUNTIME_DEPENDENCY_SCHEMAS,
  attestDataplanPreparedStatementCache,
  createFixtureServer,
  credentialFreeContractEvidence,
  fixtureConfigurationIdentity,
  loadInstalledDataplanPgAdaptor,
  makeRuntimePoolStats,
  parseServerOptions,
  parseRuntimePoolMaxUses,
  preparedResetBackendEvidence,
  preparedStatementCacheRequestFromEnvironment,
  matchTenantUpgradePath,
  installedRuntimeArtifactManifest,
  hostileControlEnabledFor,
  realtimeSchemaFor,
  provisionAttestationSha256,
  resolvedLocalRuntimeArtifactManifest,
  runtimeDependencySchemasFor,
  runtimeArtifactManifest,
  runtimeArtifactFingerprint,
  runtimePoolContractEvidence,
  timingSafeTokenEqual,
};
