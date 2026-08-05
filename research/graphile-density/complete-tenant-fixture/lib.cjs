'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FIXTURE_DIR = __dirname;
const REPO_ROOT = path.resolve(FIXTURE_DIR, '../../..');
const LOOPBACK_URL_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

const TENANTS = Object.freeze([
  Object.freeze({
    id: 'a',
    schema: 'ctf_a',
    runtimeRoleArgument: 'runtime-role-a',
    runtimePasswordEnvironment: 'CTF_RUNTIME_A_PGPASSWORD',
    token: 'tenant-a-canary',
    databaseId: '10000000-0000-4000-8000-00000000000a',
    apiId: '20000000-0000-4000-8000-00000000000a',
    metadataField: 'metadataA',
    foreignSchema: 'ctf_b',
    foreignToken: 'tenant-b-canary',
  }),
  Object.freeze({
    id: 'b',
    schema: 'ctf_b',
    runtimeRoleArgument: 'runtime-role-b',
    runtimePasswordEnvironment: 'CTF_RUNTIME_B_PGPASSWORD',
    token: 'tenant-b-canary',
    databaseId: '10000000-0000-4000-8000-00000000000b',
    apiId: '20000000-0000-4000-8000-00000000000b',
    metadataField: 'metadataB',
    foreignSchema: 'ctf_c',
    foreignToken: 'tenant-c-canary',
  }),
  Object.freeze({
    id: 'c',
    schema: 'ctf_c',
    runtimeRoleArgument: 'runtime-role-c',
    runtimePasswordEnvironment: 'CTF_RUNTIME_C_PGPASSWORD',
    token: 'tenant-c-canary',
    databaseId: '10000000-0000-4000-8000-00000000000c',
    apiId: '20000000-0000-4000-8000-00000000000c',
    metadataField: 'metadataC',
    foreignSchema: 'ctf_a',
    foreignToken: 'tenant-a-canary',
  }),
]);

const REQUIRED_CAPABILITIES = Object.freeze([
  'graphile-generated',
  'i18n',
  'llm-deterministic',
  'rag-deterministic',
  'bm25',
  'tsvector',
  'trigram',
  'vector',
  'postgis',
  'ltree',
  'uploads-storage-presign-only',
  'bulk-mutations',
  'realtime-tagged-write',
  'function-bindings',
  'security-session',
]);

const REQUIRED_CANARIES = Object.freeze([
  'cross-schema-identifiers',
  'metadata',
  'functions',
  'sequences',
  'prepared-statement-reuse',
  'poisoned-gucs',
  'rollback-savepoints',
  'plugin-raw-sql',
  'owner-bypass-role',
  'schema-drift',
  'cache-invalidation',
  'concurrent-builds',
  'connection-reuse',
]);

const parseArgs = (argv) => {
  const result = { positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      result.positional.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = true;
    } else {
      result[key] = next;
      index += 1;
    }
  }
  return result;
};

const requireString = (args, name, fallback) => {
  const value = args[name] ?? fallback;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`CTF_ARGUMENT_REQUIRED:${name}`);
  }
  return value.trim();
};

const assertLoopbackBaseUrl = (value) => {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('CTF_LOOPBACK_BASE_URL_REQUIRED');
  }
  if (
    parsed.protocol !== 'http:'
    || !LOOPBACK_URL_HOSTS.has(parsed.hostname)
    || parsed.username
    || parsed.password
    || (parsed.pathname !== '/' && parsed.pathname !== '')
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('CTF_LOOPBACK_BASE_URL_REQUIRED');
  }
  return parsed.origin;
};

const parsePositiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`CTF_INVALID_POSITIVE_INTEGER:${label}`);
  }
  return parsed;
};

const validateIntrospectionClientReleaseMode = (value = 'destroy') => {
  if (value !== 'reuse' && value !== 'destroy') {
    throw new Error(`CTF_INTROSPECTION_CLIENT_RELEASE_MODE_INVALID:${value}`);
  }
  return value;
};

const fileSha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const readManifest = () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'coverage-manifest.json'), 'utf8'));
  validateManifest(manifest);
  return manifest;
};

const uniqueStrings = (values, label) => {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== 'string' || !value)) {
    throw new Error(`CTF_MANIFEST_INVALID:${label}`);
  }
  if (new Set(values).size !== values.length) throw new Error(`CTF_MANIFEST_DUPLICATE:${label}`);
};

const validateManifest = (manifest) => {
  if (!manifest || manifest.version !== 1 || manifest.fixture !== 'complete-tenant-abc-v1') {
    throw new Error('CTF_MANIFEST_INVALID:identity');
  }
  if (
    manifest.performanceClaimsAllowed !== false
    || manifest.productionQualificationImplemented !== false
    || manifest.runtimeIsolation?.model !== 'dedicated-login-and-pool-per-tenant'
    || manifest.runtimeIsolation?.sharedRuntimePool !== false
    || manifest.runtimeIsolation?.runtimeSchemaDriftControl !== false
    || manifest.runtimeIsolation?.checkoutSanitationRequired !== true
  ) {
    throw new Error('CTF_MANIFEST_INVALID:failClosedBoundary');
  }
  uniqueStrings(manifest.tenants, 'tenants');
  uniqueStrings(manifest.surfacesPerTenant, 'surfacesPerTenant');
  uniqueStrings(manifest.hostileCanaries, 'hostileCanaries');
  const capabilities = manifest.localCapabilities?.map((entry) => entry.id);
  uniqueStrings(capabilities, 'localCapabilities');
  for (const capability of REQUIRED_CAPABILITIES) {
    if (!capabilities.includes(capability)) throw new Error(`CTF_MANIFEST_MISSING_CAPABILITY:${capability}`);
  }
  for (const canary of REQUIRED_CANARIES) {
    if (!manifest.hostileCanaries.includes(canary)) throw new Error(`CTF_MANIFEST_MISSING_CANARY:${canary}`);
  }
  for (const gate of manifest.externalProviderGates ?? []) {
    if (gate.status !== 'blocking' || !Array.isArray(gate.requiredArguments) || gate.requiredArguments.length === 0) {
      throw new Error(`CTF_MANIFEST_INVALID_GATE:${gate.id ?? 'unknown'}`);
    }
  }
};

const assertProviderGates = (manifest, qualificationClass, args) => {
  if (qualificationClass === 'offline-research') {
    return {
      customerQualified: false,
      unresolved: manifest.externalProviderGates.map((gate) => gate.id),
    };
  }
  if (qualificationClass !== 'production') {
    throw new Error(`CTF_UNKNOWN_QUALIFICATION_CLASS:${qualificationClass}`);
  }
  const missing = [];
  for (const gate of manifest.externalProviderGates) {
    for (const argument of gate.requiredArguments) {
      if (typeof args[argument] !== 'string' || !args[argument].trim()) {
        missing.push(`${gate.id}:${argument}`);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`CTF_EXTERNAL_PROVIDER_GATES_UNSATISFIED:${missing.join(',')}`);
  }
  return { customerQualified: true, unresolved: [] };
};

const operation = (name, capability, query, variables, weight = 1) => ({
  name,
  capability,
  weight,
  query,
  ...(variables ? { variables } : {}),
});

const canary = (name, query, requiredMatches, forbiddenMatches, variables) => ({
  name,
  query,
  ...(variables ? { variables } : {}),
  requiredMatches,
  forbiddenMatches,
});

const operationsFor = (tenant) => [
  operation(
    'generated-document-read',
    'graphile-generated',
    'query GeneratedDocumentRead { documents(first: 1) { nodes { id tenantId title } } }',
  ),
  operation(
    'localized-post-read',
    'i18n',
    'query LocalizedPostRead { posts(first: 1, where: { id: { equalTo: 1 } }) { nodes { tenantId localeStrings { langCode title body } } } }',
  ),
  operation(
    'deterministic-embed',
    'llm-deterministic',
    'query DeterministicEmbed { embedText(text: "tenant fixture") { vector dimensions } }',
  ),
  operation(
    'deterministic-rag',
    'rag-deterministic',
    'query DeterministicRag { ragQuery(prompt: "machine learning tenant fixture", contextLimit: 2) { answer tokensUsed sources { content similarity tableName parentId } } }',
    undefined,
    0.5,
  ),
  operation(
    'bm25-search',
    'bm25',
    'query Bm25Search { documents(where: { bm25Body: { query: "machine learning intelligence" } }) { nodes { tenantId title bodyBm25Score } } }',
  ),
  operation(
    'tsvector-search',
    'tsvector',
    'query TsvectorSearch { documents(where: { tsvTsv: "machine learning" }) { nodes { tenantId title tsvRank } } }',
  ),
  operation(
    'trigram-search',
    'trigram',
    'query TrigramSearch { documents(where: { trgmTitle: { value: "Machne Lerning", threshold: 0.05 } }) { nodes { tenantId title titleTrgmSimilarity } } }',
  ),
  operation(
    'vector-search',
    'vector',
    'query VectorSearch { documents(where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }) { nodes { tenantId title embeddingVectorDistance } } }',
  ),
  operation(
    'postgis-read',
    'postgis',
    'query PostgisRead { documents(first: 1) { nodes { tenantId location { geojson } } } }',
  ),
  operation(
    'ltree-filter',
    'ltree',
    'query LtreeFilter { documents(where: { path: { within: "/root" } }) { nodes { tenantId title path } } }',
  ),
  operation(
    'presigned-upload',
    'uploads-storage-presign-only',
    'mutation PresignedUpload($input: UploadAppFileInput!) { uploadAppFile(input: $input) { fileId key deduplicated expiresAt uploadUrl } }',
    {
      input: {
        bucketKey: 'private',
        contentHash: crypto.createHash('sha256').update(`complete-tenant-${tenant.id}`).digest('hex'),
        contentType: 'text/plain',
        size: 32,
        filename: `${tenant.id}.txt`,
      },
    },
    0.25,
  ),
  operation(
    'bulk-upsert',
    'bulk-mutations',
    'mutation BulkUpsert($name: String!) { bulkUpsertBulkItems(input: { values: [{ name: $name, quantity: 1 }], onConflict: { constraint: BULK_ITEMS_NAME_KEY } }) { affectedCount } }',
    { name: `${tenant.token}-bulk` },
    0.5,
  ),
  operation(
    'realtime-tagged-update',
    'realtime-tagged-write',
    'mutation RealtimeTaggedUpdate($payload: String!) { updateRealtimeItem(input: { id: 1, realtimeItemPatch: { payload: $payload } }) { realtimeItem { id tenantId payload } } }',
    { payload: `${tenant.token}-realtime` },
    0.5,
  ),
  operation(
    'bound-function-invocation',
    'function-bindings',
    'mutation BoundFunctionInvocation($payload: JSON!) { fixtureTask(input: { payload: $payload }) { invocationId status } }',
    { payload: { tenant: tenant.id, source: 'complete-tenant-fixture' } },
    0.25,
  ),
  operation(
    'security-context-read',
    'security-session',
    'query SecurityContextRead { requestIdentity }',
    undefined,
    0.25,
  ),
];

const tokenMatch = (pathValue, value) => ({ path: pathValue, value });

const canariesFor = (tenant) => {
  const ownIdentity = `${tenant.token}:${tenant.databaseId}`;
  const identityQuery = 'query TenantIdentity { tenantIdentity }';
  return [
    canary(
      'cross-schema-identifiers',
      'query CrossSchemaIdentifier($schemaName: String!) { foreignAccessState(targetSchema: $schemaName) }',
      [tokenMatch('/data/foreignAccessState', 'acl-denied')],
      [tokenMatch('/data/foreignAccessState', 'visible')],
      { schemaName: tenant.foreignSchema },
    ),
    canary(
      'metadata',
      'query MetadataIsolation { __type(name: "Query") { fields { name } } }',
      [tokenMatch('/data/__type/fields/*/name', tenant.metadataField)],
      TENANTS.filter((candidate) => candidate.id !== tenant.id)
        .map((candidate) => tokenMatch('/data/__type/fields/*/name', candidate.metadataField)),
    ),
    canary(
      'functions',
      identityQuery,
      [tokenMatch('/data/tenantIdentity', tenant.token)],
      [tokenMatch('/data/tenantIdentity', tenant.foreignToken)],
    ),
    canary(
      'sequences',
      'mutation SequenceIsolation($secret: String!) { createTenantCanary(input: { tenantCanary: { secret: $secret } }) { tenantCanary { tenantId secret } } }',
      [tokenMatch('/data/createTenantCanary/tenantCanary/tenantId', tenant.token)],
      [tokenMatch('/data/createTenantCanary/tenantCanary/tenantId', tenant.foreignToken)],
      { secret: `${tenant.token}-sequence` },
    ),
    canary(
      'prepared-statement-reuse',
      identityQuery,
      [tokenMatch('/data/tenantIdentity', tenant.token)],
      [tokenMatch('/data/tenantIdentity', tenant.foreignToken)],
    ),
    canary(
      'poisoned-gucs',
      'query RequestIdentity { requestIdentity }',
      [tokenMatch('/data/requestIdentity', ownIdentity)],
      [tokenMatch('/data/requestIdentity', `${tenant.foreignToken}:${tenant.databaseId}`)],
    ),
    canary(
      'rollback-savepoints',
      'query RequestIdentityAfterRollbackProbe { requestIdentity }',
      [tokenMatch('/data/requestIdentity', ownIdentity)],
      [tokenMatch('/data/requestIdentity', `poisoned-savepoint:${tenant.databaseId}`)],
    ),
    canary(
      'plugin-raw-sql',
      'query I18nRawSql { posts(first: 1, where: { id: { equalTo: 1 } }) { nodes { localeStrings { title } } } }',
      [tokenMatch('/data/posts/nodes/0/localeStrings/title', `${tenant.token} español`)],
      [tokenMatch('/data/posts/nodes/0/localeStrings/title', `${tenant.foreignToken} español`)],
    ),
    canary(
      'owner-bypass-role',
      'query RuntimeRoleSafety { runtimeRoleSafe }',
      [tokenMatch('/data/runtimeRoleSafe', true)],
      [tokenMatch('/data/runtimeRoleSafe', false)],
    ),
    canary(
      'schema-drift',
      'query SchemaEpoch { schemaEpoch }',
      [tokenMatch('/data/schemaEpoch', 1)],
      [tokenMatch('/data/schemaEpoch', 0)],
    ),
    canary(
      'cache-invalidation',
      identityQuery,
      [tokenMatch('/data/tenantIdentity', tenant.token)],
      [tokenMatch('/data/tenantIdentity', tenant.foreignToken)],
    ),
    canary(
      'concurrent-builds',
      identityQuery,
      [tokenMatch('/data/tenantIdentity', tenant.token)],
      [tokenMatch('/data/tenantIdentity', tenant.foreignToken)],
    ),
    canary(
      'connection-reuse',
      'query RequestIdentity { requestIdentity }',
      [tokenMatch('/data/requestIdentity', ownIdentity)],
      [tokenMatch('/data/requestIdentity', `${tenant.foreignToken}:${tenant.databaseId}`)],
    ),
  ];
};

const fallbackBuildContract = (arm, tenant) =>
  `ctf:unresolved:v1:${arm}:${tenant.id}:api`;

const fallbackPoolIdentity = (arm, tenant) =>
  `ctf:unresolved-pool:v1:${arm}:${tenant.id}:api`;

const makeFleet = ({
  arm = 'local-complete-tenant',
  port = 3391,
  buildContracts = {},
  runtimePoolIdentities = {},
  physicalDatabase = 'ctf-unresolved-physical-database',
} = {}) => ({
  version: 1,
  tenants: TENANTS.map((tenant) => ({
    id: `complete-tenant-${tenant.id}`,
    databases: [{
      id: tenant.databaseId,
      physicalDatabase,
      apis: [{
        id: tenant.apiId,
        runtimePoolIdentity: runtimePoolIdentities[tenant.id]
          ?? fallbackPoolIdentity(arm, tenant),
        runtimePoolIdentities: {
          [arm]: runtimePoolIdentities[tenant.id]
            ?? fallbackPoolIdentity(arm, tenant),
        },
        physicalSchemas: [tenant.schema],
        routingLabels: [`ctf-${tenant.id}-api`],
        realtime: false,
        surfaces: ['api'],
      }],
    }],
    surfaces: [{
      name: 'api',
      buildContract: buildContracts[tenant.id] ?? fallbackBuildContract(arm, tenant),
      buildContracts: {
        [arm]: buildContracts[tenant.id] ?? fallbackBuildContract(arm, tenant),
      },
      url: `http://127.0.0.1:{port}/tenant/${tenant.id}/graphql`,
      headers: { 'accept-language': 'es' },
      warmup: operation('warm-tenant-identity', 'graphile-generated', 'query WarmTenantIdentity { tenantIdentity }'),
      operations: operationsFor(tenant),
      canaries: canariesFor(tenant),
    }],
  })),
});

const makePlan = ({
  arm = 'local-complete-tenant',
  port = 3391,
  postgresContainer,
  commit,
  durationSec = 900,
  cwd = REPO_ROOT,
  introspectionMode = 'scoped-required',
  introspectionClientReleaseMode = 'destroy',
  runtimeRoles,
} = {}) => {
  if (!postgresContainer) throw new Error('CTF_ARGUMENT_REQUIRED:postgres-container');
  if (!commit) throw new Error('CTF_ARGUMENT_REQUIRED:commit');
  if (!['stock', 'scoped-required'].includes(introspectionMode)) {
    throw new Error(`CTF_INTROSPECTION_MODE_INVALID:${introspectionMode}`);
  }
  validateIntrospectionClientReleaseMode(introspectionClientReleaseMode);
  for (const tenant of TENANTS) {
    if (typeof runtimeRoles?.[tenant.id] !== 'string' || !runtimeRoles[tenant.id].trim()) {
      throw new Error(`CTF_ARGUMENT_REQUIRED:${tenant.runtimeRoleArgument}`);
    }
  }
  return {
    version: 1,
    fleetFile: 'fleet.json',
    artifactDir: '../artifacts',
    arms: [{
      name: arm,
      commit,
      cwd,
      command: [
        'node',
        path.join(FIXTURE_DIR, 'server.cjs'),
        '--port',
        '{port}',
        '--arm',
        arm,
        '--mode',
        '{mode}',
        '--introspection-client-release-mode',
        introspectionClientReleaseMode,
        '--runtime-pool-max',
        '1',
        '--runtime-pool-max-uses',
        'unlimited',
        ...TENANTS.flatMap((tenant) => [
          `--${tenant.runtimeRoleArgument}`,
          runtimeRoles[tenant.id],
        ]),
      ],
      port,
      readinessUrl: `http://127.0.0.1:{port}/healthz`,
      memoryUrl: `http://127.0.0.1:{port}/debug/memory`,
      postgresContainer,
      introspectionMode,
      entrySha256: fileSha256(path.join(FIXTURE_DIR, 'server.cjs')),
      lockfileSha256: fileSha256(path.join(REPO_ROOT, 'pnpm-lock.yaml')),
      env: {
        GRAPHILE_CACHE_MAX: '3',
        GRAPHILE_CACHE_INSTANCE_HEAP_BYTES: String(64 * 1024 * 1024),
        GRAPHILE_CACHE_SERVER_RESERVE_BYTES: String(256 * 1024 * 1024),
        GRAPHILE_CACHE_BUILD_RESERVE_BYTES: String(768 * 1024 * 1024),
        GRAPHILE_BUILD_MAX_CONCURRENCY: '1',
        GRAPHILE_BUILD_CONCURRENCY: '1',
        GRAPHILE_BUILD_QUEUE_MAX: '8',
        PG_CACHE_MAX: '4',
        PG_POOL_MAX: '1',
        PG_POOL_MAX_USES: '0',
        DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE: '100',
      },
    }],
    heapMiB: [4096],
    tenantCountsByHeapMiB: { 4096: [3] },
    repetitions: 3,
    runOrderSeed: 'complete-tenant-abc-v1',
    requiredCapabilities: [...REQUIRED_CAPABILITIES],
    requiredCanaries: [...REQUIRED_CANARIES],
    workload: {
      durationSec,
      rpsPerTenant: 1,
      minWorkloadRequestsPerSurface: 30,
      requestTimeoutMs: 30000,
      maxInFlight: 32,
      canaryIntervalSec: 60,
      warmupTimeoutMs: 180000,
      warmupTimeoutPerSurfaceMs: 30000,
      warmupConcurrency: 3,
    },
    gates: {
      maxErrorRate: 0.005,
      maxP99Ms: 150,
      maxPostWarmupHeapGrowthMiBPerHour: 5,
      minMedianDensityImprovement: 0.15,
      minAdditionalTenantsEveryRun: 1,
      requireZeroBleed: true,
      requireNoPostWarmupEvictions: true,
      requireNoPostWarmupBuildRefusals: true,
      requireNoPostWarmupBuilds: true,
      requirePostgresMemoryTelemetry: true,
      requireFreshPostgresRunAttestation: false,
      requireRetainedMemoryCheckpoints: false,
      requirePhysicalDatabaseTelemetry: false,
      requireConclusiveCanaries: true,
      requireCompletePeriodicCanaryCoverage: true,
      requireConclusiveOperationOracles: false,
      requireExplicitCustomerTopology: true,
      requiredCacheAdmissionMode: 'evict-idle',
    },
  };
};

const decodePointerSegment = (segment) => segment
  .replace(/~1/g, '/')
  .replace(/~0/g, '~');

const jsonPointerValues = (root, pointer) => {
  if (pointer === '') return [root];
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) return [];
  let values = [root];
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = decodePointerSegment(rawSegment);
    const next = [];
    for (const value of values) {
      if (segment === '*') {
        if (Array.isArray(value)) next.push(...value);
        else if (value && typeof value === 'object') next.push(...Object.values(value));
      } else if (Array.isArray(value) && /^(0|[1-9]\d*)$/.test(segment)) {
        const index = Number(segment);
        if (index < value.length) next.push(value[index]);
      } else if (
        value
        && typeof value === 'object'
        && Object.prototype.hasOwnProperty.call(value, segment)
      ) {
        next.push(value[segment]);
      }
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
};

const deepEqualJson = (left, right) => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length
      && left.every((value, index) => deepEqualJson(value, right[index]));
  }
  if (
    left
    && right
    && typeof left === 'object'
    && typeof right === 'object'
    && !Array.isArray(left)
    && !Array.isArray(right)
  ) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return deepEqualJson(leftKeys, rightKeys)
      && leftKeys.every((key) => deepEqualJson(left[key], right[key]));
  }
  return false;
};

const evaluateCanaryResponse = (canary, responseBody) => {
  const forbidden = canary.forbiddenMatches.find((match) =>
    jsonPointerValues(responseBody, match.path).some((value) =>
      deepEqualJson(value, match.value)
    )
  );
  const missing = canary.requiredMatches.find((match) =>
    !jsonPointerValues(responseBody, match.path).some((value) =>
      deepEqualJson(value, match.value)
    )
  );
  return {
    conclusive: !missing,
    violation: Boolean(forbidden),
    ...(forbidden ? { detail: `forbidden match at '${forbidden.path}' was returned` } : {}),
    ...(!forbidden && missing
      ? { detail: `required match at '${missing.path}' was absent` }
      : {}),
  };
};

const assertCredentialFree = (value) => {
  const reject = () => {
    throw new Error('CTF_ARTIFACT_CONTAINS_CREDENTIAL_MARKER');
  };
  const visit = (candidate, ancestors = new Set()) => {
    if (typeof candidate === 'string') {
      if (
        /\bbearer\s+[a-z0-9._~+/-]{16,}/i.test(candidate)
        || /postgres(?:ql)?:\/\/[^:@/\s]+:[^@/\s]+@/i.test(candidate)
      ) reject();
      return;
    }
    if (!candidate || typeof candidate !== 'object') return;
    if (ancestors.has(candidate)) return;
    const nextAncestors = new Set(ancestors).add(candidate);
    if (Array.isArray(candidate)) {
      for (const entry of candidate) visit(entry, nextAncestors);
      return;
    }
    for (const [key, entry] of Object.entries(candidate)) {
      if (/password|secretAccessKey|authorization|controlToken|observabilityToken|accessKeyId/i.test(key)) {
        reject();
      }
      visit(entry, nextAncestors);
    }
  };
  if (typeof value === 'string') {
    try {
      visit(JSON.parse(value));
    } catch (error) {
      if (error?.message === 'CTF_ARTIFACT_CONTAINS_CREDENTIAL_MARKER') throw error;
      visit(value);
    }
  } else {
    visit(value);
  }
};

module.exports = {
  FIXTURE_DIR,
  REPO_ROOT,
  REQUIRED_CANARIES,
  REQUIRED_CAPABILITIES,
  TENANTS,
  assertCredentialFree,
  assertLoopbackBaseUrl,
  assertProviderGates,
  canariesFor,
  evaluateCanaryResponse,
  fallbackBuildContract,
  fileSha256,
  makeFleet,
  makePlan,
  operationsFor,
  parseArgs,
  parsePositiveInteger,
  jsonPointerValues,
  readManifest,
  requireString,
  validateIntrospectionClientReleaseMode,
  validateManifest,
};
