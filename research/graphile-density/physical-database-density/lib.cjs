'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const completeFixture = require('../complete-tenant-fixture/lib.cjs');
const {
  computeCalibratedCapacity,
  validateCacheCalibration,
} = require('./cache-calibration.cjs');

const FIXTURE_DIR = __dirname;
const REPO_ROOT = path.resolve(FIXTURE_DIR, '../../..');
const PHYSICAL_DATABASE_CANARY = 'physical-database-routing';
const FIXTURE_ID = 'physical-database-density-v1';
const QUALIFYING_CACHE_ADMISSION_MODE = 'preserve-resident';
const DEFAULT_PREPARED_STATEMENT_CACHE_SIZE = 100;
const PROCESS_GLOBAL_POOL_MAX = 1;
const DEFAULT_IDLE_ARMS = Object.freeze([
  Object.freeze({ name: 'physical-db-idle-30s', idleTimeoutMs: 30_000 }),
  Object.freeze({ name: 'physical-db-idle-5s', idleTimeoutMs: 5_000 }),
  Object.freeze({ name: 'physical-db-idle-1s', idleTimeoutMs: 1_000 }),
]);
const DENSITY_TUNING_ARMS = Object.freeze([
  Object.freeze({
    name: 'physical-db-dedicated-stock',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 2,
    realtimeNotificationMode: 'dedicated',
    realtimeCursorPollIntervalMs: 5_000,
    realtimeCursorHeartbeatIntervalMs: 30_000,
    v8Profile: 'stock',
  }),
  Object.freeze({
    name: 'physical-db-shared-stock',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'stock',
  }),
  Object.freeze({
    name: 'physical-db-shared-no-prepare',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    preparedStatementCacheSize: 0,
    v8Profile: 'stock',
  }),
  Object.freeze({
    name: 'physical-db-shared-maxuses-1',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    runtimePoolMaxUses: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'stock',
  }),
  Object.freeze({
    name: 'physical-db-shared-size',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'optimize-for-size',
  }),
  Object.freeze({
    name: 'physical-db-shared-baseline-size',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'baseline-optimize-for-size',
  }),
  Object.freeze({
    name: 'physical-db-shared-jitless-size',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'jitless-optimize-for-size',
  }),
  Object.freeze({
    name: 'physical-db-shared-maxuses-1-size',
    idleTimeoutMs: 1_000,
    runtimePoolMax: 1,
    runtimePoolMaxUses: 1,
    realtimeNotificationMode: 'shared-exact',
    realtimeCursorPollIntervalMs: 30_000,
    realtimeCursorHeartbeatIntervalMs: 60_000,
    v8Profile: 'optimize-for-size',
  }),
]);

const runtimePoolMaxForArm = (arm) => arm.runtimePoolMax ?? 2;
const runtimePoolMaxUsesForArm = (arm) => arm.runtimePoolMaxUses ?? null;
const notificationModeForArm = (arm) => arm.realtimeNotificationMode ?? 'dedicated';
const cursorPollMsForArm = (arm) => arm.realtimeCursorPollIntervalMs ?? 5_000;
const cursorHeartbeatMsForArm = (arm) =>
  arm.realtimeCursorHeartbeatIntervalMs ?? 30_000;
const preparedStatementCacheSizeForArm = (arm) =>
  arm.preparedStatementCacheSize ?? DEFAULT_PREPARED_STATEMENT_CACHE_SIZE;

const validateCustomerCountRamp = (counts, label) => {
  if (
    !Array.isArray(counts)
    || counts.length === 0
    || counts.some((count) => !Number.isSafeInteger(count) || count <= 0)
    || new Set(counts).size !== counts.length
    || counts.some((count, index) => index > 0 && count <= counts[index - 1])
  ) {
    throw new Error(`PDCF_PLAN_CUSTOMER_COUNT_RAMP_INVALID:${label}`);
  }
  return counts;
};

const customerCountsForHeap = ({ tenantCounts, tenantCountsByHeapMiB }, heap) =>
  tenantCountsByHeapMiB?.[String(heap)] ?? tenantCounts;

const validateCustomerCountMatrix = ({
  tenantCounts,
  tenantCountsByHeapMiB,
  heapMiB,
}) => {
  if (!Array.isArray(heapMiB) || heapMiB.length === 0) {
    throw new Error('PDCF_PLAN_HEAP_RAMP_REQUIRED');
  }
  if (tenantCounts != null) {
    validateCustomerCountRamp(tenantCounts, 'default');
  }
  if (tenantCountsByHeapMiB != null) {
    if (
      typeof tenantCountsByHeapMiB !== 'object'
      || Array.isArray(tenantCountsByHeapMiB)
      || tenantCountsByHeapMiB === null
    ) {
      throw new Error('PDCF_PLAN_CUSTOMER_COUNT_MATRIX_INVALID');
    }
    const configuredHeaps = new Set(heapMiB.map(String));
    if (Object.keys(tenantCountsByHeapMiB).some((heap) => !configuredHeaps.has(heap))) {
      throw new Error('PDCF_PLAN_CUSTOMER_COUNT_MATRIX_INVALID');
    }
  }
  const byHeap = Object.fromEntries(heapMiB.map((heap) => {
    const counts = customerCountsForHeap({ tenantCounts, tenantCountsByHeapMiB }, heap);
    return [String(heap), validateCustomerCountRamp(counts, String(heap))];
  }));
  return {
    byHeap,
    all: [...new Set(Object.values(byHeap).flat())].sort((left, right) => left - right),
  };
};
const RESIDENT_SUBSCRIPTION = `
subscription PhysicalDensityRealtimeResident {
  onRealtimeItemChanged {
    event
    overflow
    realtimeItem { id tenantId physicalDatabaseIdentity payload }
  }
}
`;
const REALTIME_PRIME_MUTATION = `
mutation PhysicalDensityRealtimePrime($payload: String!) {
  updateRealtimeItem(input: { id: 1, realtimeItemPatch: { payload: $payload } }) {
    realtimeItem { id tenantId physicalDatabaseIdentity payload }
  }
}
`;

const strictIdentifier = (value, label) => {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_]*$/.test(value) || value.length > 40) {
    throw new Error(`PDCF_INVALID_IDENTIFIER:${label}`);
  }
  return value;
};

const customerSuffix = (ordinal) => String(ordinal).padStart(4, '0');

const makeCustomer = (prefix, ordinal) => {
  const suffix = customerSuffix(ordinal);
  const rolePrefix = `${prefix}_c${suffix}`;
  return Object.freeze({
    id: `physical-customer-${suffix}`,
    ordinal,
    database: `${prefix}_db_${suffix}`,
    // The schema-level canary returns current_database(), so the database name
    // is both credential-free and conclusive under wrong-database routing.
    physicalIdentity: `${prefix}_db_${suffix}`,
    roles: Object.freeze(Object.fromEntries(completeFixture.TENANTS.map((tenant) => [
      tenant.id,
      `${rolePrefix}_${tenant.id}`,
    ]))),
    // LISTEN is shared only by the three exact Graphile generations that
    // target this physical database. It never executes GraphQL or reads an
    // application schema.
    notificationRole: `${rolePrefix}_notify`,
  });
};

const makeCustomers = (prefix, count) => {
  strictIdentifier(prefix, 'prefix');
  if (!Number.isSafeInteger(count) || count <= 0 || count > 9999) {
    throw new Error('PDCF_INVALID_CUSTOMER_COUNT');
  }
  const customers = Array.from({ length: count }, (_unused, index) =>
    makeCustomer(prefix, index + 1)
  );
  for (const customer of customers) {
    strictIdentifier(customer.database, 'database');
    for (const role of Object.values(customer.roles)) strictIdentifier(role, 'role');
    strictIdentifier(customer.notificationRole, 'notification-role');
  }
  return customers;
};

const validateProvisionManifest = (manifest) => {
  if (
    !manifest
    || manifest.version !== 1
    || manifest.fixture !== FIXTURE_ID
    || typeof manifest.prefix !== 'string'
    || !Array.isArray(manifest.customers)
    || manifest.customers.length === 0
  ) {
    throw new Error('PDCF_MANIFEST_INVALID');
  }
  strictIdentifier(manifest.prefix, 'prefix');
  const ids = new Set();
  const databases = new Set();
  const physicalIdentities = new Set();
  const roles = new Set();
  for (const customer of manifest.customers) {
    if (
      typeof customer?.id !== 'string'
      || ids.has(customer.id)
      || !Number.isSafeInteger(customer.ordinal)
      || customer.ordinal <= 0
      || typeof customer.physicalIdentity !== 'string'
      || !customer.physicalIdentity
    ) {
      throw new Error('PDCF_MANIFEST_CUSTOMER_INVALID');
    }
    ids.add(customer.id);
    strictIdentifier(customer.database, 'database');
    if (databases.has(customer.database)) throw new Error('PDCF_DATABASE_DUPLICATE');
    databases.add(customer.database);
    if (customer.physicalIdentity !== customer.database) {
      throw new Error(`PDCF_PHYSICAL_IDENTITY_DATABASE_MISMATCH:${customer.id}`);
    }
    if (physicalIdentities.has(customer.physicalIdentity)) {
      throw new Error('PDCF_PHYSICAL_IDENTITY_DUPLICATE');
    }
    physicalIdentities.add(customer.physicalIdentity);
    for (const tenant of completeFixture.TENANTS) {
      const role = strictIdentifier(customer.roles?.[tenant.id], 'role');
      if (roles.has(role)) throw new Error('PDCF_ROLE_DUPLICATE');
      roles.add(role);
    }
    const notificationRole = strictIdentifier(
      customer.notificationRole,
      'notification-role',
    );
    if (roles.has(notificationRole)) throw new Error('PDCF_ROLE_DUPLICATE');
    roles.add(notificationRole);
  }
  return manifest;
};

const validateMeasurementProvisionClone = (provisionClone) => {
  if (
    !provisionClone
    || provisionClone.version !== 1
    || typeof provisionClone.id !== 'string'
    || !provisionClone.id.trim()
    || provisionClone.purpose !== 'measurement'
    || !/^sha256:[a-f0-9]{64}$/i.test(provisionClone.attestationSetSha256 ?? '')
  ) {
    throw new Error('PDCF_MEASUREMENT_PROVISION_CLONE_REQUIRED');
  }
  return provisionClone;
};

const validateSecrets = (secrets, manifest) => {
  if (!secrets || secrets.version !== 1 || secrets.fixture !== FIXTURE_ID) {
    throw new Error('PDCF_SECRETS_INVALID');
  }
  const requiredRoles = manifest.customers.flatMap((customer) => Object.values(customer.roles));
  for (const role of requiredRoles) {
    const password = secrets.runtimePasswords?.[role];
    if (typeof password !== 'string' || Buffer.byteLength(password) < 24) {
      throw new Error(`PDCF_RUNTIME_PASSWORD_INVALID:${role}`);
    }
  }
  for (const customer of manifest.customers) {
    const password = secrets.notificationPasswords?.[customer.notificationRole];
    if (typeof password !== 'string' || Buffer.byteLength(password) < 24) {
      throw new Error(`PDCF_NOTIFICATION_PASSWORD_INVALID:${customer.notificationRole}`);
    }
  }
  return secrets;
};

const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));

const readPrivateJson = (file) => {
  const absolute = path.resolve(file);
  let before;
  try {
    before = fs.lstatSync(absolute);
  } catch {
    throw new Error('PDCF_SECRETS_FILE_UNREADABLE');
  }
  if (before.isSymbolicLink() || !before.isFile()) {
    throw new Error('PDCF_SECRETS_FILE_MUST_BE_REGULAR');
  }
  if ((before.mode & 0o777) !== 0o600) {
    throw new Error('PDCF_SECRETS_FILE_MODE_MUST_BE_0600');
  }

  let descriptor;
  try {
    descriptor = fs.openSync(
      absolute,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0),
    );
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isFile()
      || opened.dev !== before.dev
      || opened.ino !== before.ino
      || (opened.mode & 0o777) !== 0o600
    ) {
      throw new Error('PDCF_SECRETS_FILE_CHANGED_DURING_OPEN');
    }
    return JSON.parse(fs.readFileSync(descriptor, 'utf8'));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PDCF_')) throw error;
    throw new Error('PDCF_SECRETS_FILE_UNREADABLE');
  } finally {
    if (descriptor != null) fs.closeSync(descriptor);
  }
};

const makeSecretResolver = (rawSecrets, manifest) => {
  const secrets = validateSecrets(rawSecrets, manifest);
  const runtimePasswords = new Map(Object.entries(secrets.runtimePasswords));
  const notificationPasswords = new Map(Object.entries(secrets.notificationPasswords));
  return Object.freeze({
    runtimePasswordFor(role) {
      const value = runtimePasswords.get(role);
      if (typeof value !== 'string') throw new Error(`PDCF_RUNTIME_PASSWORD_REQUIRED:${role}`);
      return value;
    },
    notificationPasswordFor(role) {
      const value = notificationPasswords.get(role);
      if (typeof value !== 'string') {
        throw new Error(`PDCF_NOTIFICATION_PASSWORD_REQUIRED:${role}`);
      }
      return value;
    },
    toJSON() {
      return { kind: 'physical-density-secret-resolver', redacted: true };
    },
  });
};

const loadProvision = (manifestFile, secretsFile) => {
  const absoluteManifest = path.resolve(manifestFile);
  const absoluteSecrets = path.resolve(secretsFile);
  const manifestStat = fs.statSync(absoluteManifest);
  const secretsStat = fs.lstatSync(absoluteSecrets);
  if (manifestStat.dev === secretsStat.dev && manifestStat.ino === secretsStat.ino) {
    throw new Error('PDCF_MANIFEST_SECRETS_MUST_BE_DISTINCT');
  }
  const manifest = validateProvisionManifest(readJson(absoluteManifest));
  const secretResolver = makeSecretResolver(readPrivateJson(absoluteSecrets), manifest);
  return { manifest, secretResolver };
};

const physicalCanary = (customer, otherCustomers) => ({
  name: PHYSICAL_DATABASE_CANARY,
  query: 'query PhysicalDatabaseRouting { physicalDatabaseIdentity }',
  requiredMatches: [{
    path: '/data/physicalDatabaseIdentity',
    value: customer.physicalIdentity,
  }],
  // A one-customer mechanics run has no foreign database name to enumerate,
  // but a null identity is still an explicit routing failure. Keep that
  // negative oracle for every fleet, then add the concrete foreign identities
  // when the density point contains multiple customers.
  forbiddenMatches: [
    {
      path: '/data/physicalDatabaseIdentity',
      value: null,
    },
    ...otherCustomers.map((candidate) => ({
      path: '/data/physicalDatabaseIdentity',
      value: candidate.physicalIdentity,
    })),
  ],
  invariants: [{
    path: '/data/physicalDatabaseIdentity',
    everyEquals: customer.physicalIdentity,
    min: 1,
    max: 1,
  }],
});

const statusFor = (statuses, armName, customerId) => {
  const status = statuses?.[armName]?.[customerId];
  if (!status || status.physicalDatabase == null) {
    throw new Error(`PDCF_STATUS_REQUIRED:${armName}:${customerId}`);
  }
  return status;
};

const runtimePoolContractFingerprintFor = (status, tenantId) => {
  const fingerprint = status?.contractEvidence?.runtimePools?.[tenantId]?.fingerprint;
  if (!/^pg-contract-evidence:v1:[a-f0-9]{64}$/.test(fingerprint ?? '')) {
    throw new Error(`PDCF_RUNTIME_POOL_CONTRACT_EVIDENCE_MISSING:${tenantId}`);
  }
  return fingerprint;
};

const graphileBuildContractFingerprintFor = (status, tenantId) => {
  const fingerprint = status?.contractEvidence?.graphileBuilds?.[tenantId]?.fingerprint;
  if (!/^graphile-contract-evidence:v1:[a-f0-9]{64}$/.test(fingerprint ?? '')) {
    throw new Error(`PDCF_GRAPHILE_BUILD_CONTRACT_EVIDENCE_MISSING:${tenantId}`);
  }
  return fingerprint;
};

const realtimeProbe = (customer, tenant, otherCustomers) => {
  const payload = `${customer.physicalIdentity}:${tenant.id}:configured-placeholder`;
  const foreignEventMatches = [
    ...completeFixture.TENANTS
    .filter((candidate) => candidate.id !== tenant.id)
    .map((candidate) => ({
      path: '/data/onRealtimeItemChanged/realtimeItem/tenantId',
      value: candidate.token,
    })),
    ...otherCustomers.map((candidate) => ({
      path: '/data/onRealtimeItemChanged/realtimeItem/physicalDatabaseIdentity',
      value: candidate.physicalIdentity,
    })),
  ];
  return {
    subscription: {
      query: RESIDENT_SUBSCRIPTION,
      requiredMatches: [
        {
          path: '/data/onRealtimeItemChanged/realtimeItem/tenantId',
          value: tenant.token,
        },
        {
          path: '/data/onRealtimeItemChanged/realtimeItem/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
      ],
      forbiddenMatches: foreignEventMatches,
    },
    prime: {
      query: REALTIME_PRIME_MUTATION,
      variables: { payload },
      requiredMatches: [
        {
          path: '/data/updateRealtimeItem/realtimeItem/tenantId',
          value: tenant.token,
        },
        {
          path: '/data/updateRealtimeItem/realtimeItem/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
      ],
      forbiddenMatches: [
        ...completeFixture.TENANTS
        .filter((candidate) => candidate.id !== tenant.id)
        .map((candidate) => ({
          path: '/data/updateRealtimeItem/realtimeItem/tenantId',
          value: candidate.token,
        })),
        ...otherCustomers.map((candidate) => ({
          path: '/data/updateRealtimeItem/realtimeItem/physicalDatabaseIdentity',
          value: candidate.physicalIdentity,
        })),
      ],
    },
    correlation: {
      primeVariable: 'payload',
      primeResponsePath: '/data/updateRealtimeItem/realtimeItem/payload',
      subscriptionEventPath: '/data/onRealtimeItemChanged/realtimeItem/payload',
    },
  };
};

const physicalIdentityMatches = (pathValue, customer, otherCustomers) => ({
  requiredMatches: [{
    path: pathValue,
    value: customer.physicalIdentity,
  }],
  forbiddenMatches: [
    { path: pathValue, value: null },
    ...otherCustomers.map((candidate) => ({
      path: pathValue,
      value: candidate.physicalIdentity,
    })),
  ],
  invariants: [{
    path: pathValue,
    everyEquals: customer.physicalIdentity,
    min: 1,
    max: 1,
  }],
});

const exactInvariant = (pathValue, everyEquals, min = 1, max = 1) => ({
  path: pathValue,
  everyEquals,
  min,
  max,
});

const physicalOperationsFor = (customer, tenant, otherCustomers) => {
  const baseByName = new Map(completeFixture.operationsFor(tenant).map(
    (candidate) => [candidate.name, candidate]
  ));
  const fromBase = (name, overrides) => {
    const base = baseByName.get(name);
    if (!base) throw new Error(`PDCF_OPERATION_REQUIRED:${name}`);
    baseByName.delete(name);
    return { ...base, ...overrides };
  };
  const expectedDocumentTitle = `${tenant.token} Machine Learning`;
  const documentOracle = (
    extraRequired = [],
    extraForbidden = [],
    extraInvariants = []
  ) => ({
    ...physicalIdentityMatches(
      '/data/documents/nodes/0/physicalDatabaseIdentity',
      customer,
      otherCustomers
    ),
    requiredMatches: [
      {
        path: '/data/documents/nodes/0/physicalDatabaseIdentity',
        value: customer.physicalIdentity,
      },
      { path: '/data/documents/nodes/0/tenantId', value: tenant.token },
      { path: '/data/documents/nodes/0/title', value: expectedDocumentTitle },
      ...extraRequired,
    ],
    forbiddenMatches: [
      ...physicalIdentityMatches(
        '/data/documents/nodes/0/physicalDatabaseIdentity',
        customer,
        otherCustomers
      ).forbiddenMatches,
      ...completeFixture.TENANTS.filter((candidate) => candidate.id !== tenant.id)
        .map((candidate) => ({
          path: '/data/documents/nodes/0/tenantId',
          value: candidate.token,
        })),
      ...extraForbidden,
    ],
    invariants: [
      exactInvariant(
        '/data/documents/nodes/*/physicalDatabaseIdentity',
        customer.physicalIdentity
      ),
      exactInvariant('/data/documents/nodes/*/tenantId', tenant.token),
      exactInvariant('/data/documents/nodes/*/title', expectedDocumentTitle),
      ...extraInvariants,
    ],
  });
  const uploadContentHash = crypto.createHash('sha256')
    .update(`${customer.physicalIdentity}:${tenant.id}:upload`)
    .digest('hex');
  const operations = [
    fromBase('generated-document-read', {
      query: 'query GeneratedDocumentRead { documents(first: 1) { nodes { id tenantId title physicalDatabaseIdentity } } }',
      ...documentOracle(),
    }),
    fromBase('localized-post-read', {
      query: 'query LocalizedPostRead { posts(first: 1, where: { id: { equalTo: 1 } }) { nodes { tenantId physicalDatabaseIdentity localeStrings { langCode title body } } } }',
      requiredMatches: [
        {
          path: '/data/posts/nodes/0/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/posts/nodes/0/localeStrings/title',
          value: `${tenant.token} español @${customer.physicalIdentity}`,
        },
      ],
      forbiddenMatches: [
        ...physicalIdentityMatches(
          '/data/posts/nodes/0/physicalDatabaseIdentity',
          customer,
          otherCustomers
        ).forbiddenMatches,
        ...completeFixture.TENANTS.filter((candidate) => candidate.id !== tenant.id)
          .map((candidate) => ({
            path: '/data/posts/nodes/0/localeStrings/title',
            value: `${candidate.token} español @${customer.physicalIdentity}`,
          })),
      ],
      invariants: [
        exactInvariant(
          '/data/posts/nodes/*/physicalDatabaseIdentity',
          customer.physicalIdentity
        ),
        exactInvariant(
          '/data/posts/nodes/*/localeStrings/title',
          `${tenant.token} español @${customer.physicalIdentity}`
        ),
      ],
    }),
    fromBase('deterministic-embed', {
      query: 'query DeterministicEmbed { physicalDatabaseIdentity embedText(text: "tenant fixture") { vector dimensions } }',
      requiredMatches: [
        {
          path: '/data/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        { path: '/data/embedText/vector', value: [1, 0, 0] },
        { path: '/data/embedText/dimensions', value: 3 },
      ],
      forbiddenMatches: physicalIdentityMatches(
        '/data/physicalDatabaseIdentity', customer, otherCustomers
      ).forbiddenMatches,
      invariants: [
        exactInvariant('/data/physicalDatabaseIdentity', customer.physicalIdentity),
        exactInvariant('/data/embedText/vector', [1, 0, 0]),
        exactInvariant('/data/embedText/dimensions', 3),
      ],
    }),
    fromBase('deterministic-rag', {
      query: 'query DeterministicRag { physicalDatabaseIdentity ragQuery(prompt: "machine learning tenant fixture", contextLimit: 2) { answer tokensUsed sources { content similarity tableName parentId } } }',
      requiredMatches: [
        {
          path: '/data/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/ragQuery/sources/*/content',
          value: `${tenant.token} machine learning tenant fixture context @${customer.physicalIdentity}`,
        },
        {
          path: '/data/ragQuery/answer',
          value: 'Deterministic fixture answer: machine learning tenant fixture',
        },
        { path: '/data/ragQuery/tokensUsed', value: 20 },
        { path: '/data/ragQuery/sources/*/tableName', value: 'articles' },
      ],
      forbiddenMatches: [
        ...physicalIdentityMatches(
          '/data/physicalDatabaseIdentity',
          customer,
          otherCustomers
        ).forbiddenMatches,
        ...otherCustomers.map((candidate) => ({
          path: '/data/ragQuery/sources/*/content',
          value: `${tenant.token} machine learning tenant fixture context @${candidate.physicalIdentity}`,
        })),
      ],
      invariants: [
        exactInvariant('/data/physicalDatabaseIdentity', customer.physicalIdentity),
        exactInvariant(
          '/data/ragQuery/sources/*/content',
          `${tenant.token} machine learning tenant fixture context @${customer.physicalIdentity}`
        ),
        exactInvariant('/data/ragQuery/sources/*/tableName', 'articles'),
        exactInvariant(
          '/data/ragQuery/answer',
          'Deterministic fixture answer: machine learning tenant fixture'
        ),
        exactInvariant('/data/ragQuery/tokensUsed', 20),
      ],
    }),
    fromBase('bm25-search', {
      query: 'query Bm25Search { documents(where: { bm25Body: { query: "machine learning intelligence" } }) { nodes { tenantId title physicalDatabaseIdentity bodyBm25Score } } }',
      ...documentOracle(),
    }),
    fromBase('tsvector-search', {
      query: 'query TsvectorSearch { documents(where: { tsvTsv: "machine learning" }) { nodes { tenantId title physicalDatabaseIdentity tsvRank } } }',
      ...documentOracle(),
    }),
    fromBase('trigram-search', {
      query: 'query TrigramSearch { documents(where: { trgmTitle: { value: "Machne Lerning", threshold: 0.05 } }) { nodes { tenantId title physicalDatabaseIdentity titleTrgmSimilarity } } }',
      ...documentOracle(),
    }),
    fromBase('vector-search', {
      query: 'query VectorSearch { documents(where: { vectorEmbedding: { vector: [1, 0, 0], metric: COSINE } }) { nodes { tenantId title physicalDatabaseIdentity embeddingVectorDistance } } }',
      ...documentOracle(
        [{ path: '/data/documents/nodes/0/embeddingVectorDistance', value: 0 }],
        [],
        [exactInvariant('/data/documents/nodes/*/embeddingVectorDistance', 0)]
      ),
    }),
    fromBase('postgis-read', {
      query: 'query PostgisRead { documents(first: 1) { nodes { tenantId title physicalDatabaseIdentity location { geojson } } } }',
      ...documentOracle(
        [{
          path: '/data/documents/nodes/0/location/geojson',
          value: { type: 'Point', coordinates: [106.7, 10.8] },
        }],
        [],
        [exactInvariant(
          '/data/documents/nodes/*/location/geojson',
          { type: 'Point', coordinates: [106.7, 10.8] }
        )]
      ),
    }),
    fromBase('ltree-filter', {
      query: 'query LtreeFilter { documents(where: { path: { within: "/root" } }) { nodes { tenantId title physicalDatabaseIdentity path } } }',
      ...documentOracle(
        [{ path: '/data/documents/nodes/0/path', value: `/root/${tenant.id}` }],
        [],
        [exactInvariant('/data/documents/nodes/*/path', `/root/${tenant.id}`)]
      ),
    }),
    fromBase('presigned-upload', {
      query: 'mutation PresignedUpload($input: UploadAppFileInput!) { uploadAppFile(input: $input) { fileId key deduplicated expiresAt uploadUrl } physicalDatabaseMutationIdentity(input: {}) { result } }',
      variables: {
        input: {
          bucketKey: 'private',
          contentHash: uploadContentHash,
          contentType: 'text/plain',
          size: 32,
          filename: `${customer.id}-${tenant.id}.txt`,
        },
      },
      requiredMatches: [{
        path: '/data/physicalDatabaseMutationIdentity/result',
        value: customer.physicalIdentity,
      }],
      forbiddenMatches: [
        { path: '/data/physicalDatabaseMutationIdentity/result', value: null },
        ...otherCustomers.map((candidate) => ({
          path: '/data/physicalDatabaseMutationIdentity/result',
          value: candidate.physicalIdentity,
        })),
      ],
      invariants: [exactInvariant(
        '/data/physicalDatabaseMutationIdentity/result',
        customer.physicalIdentity
      )],
      postCoverageVerification: {
        query: 'query VerifyPresignedUpload($fileId: UUID!, $contentHash: String!) { appFiles(first: 1, where: { id: { equalTo: $fileId }, contentHash: { equalTo: $contentHash } }) { nodes { id tenantId contentHash physicalDatabaseIdentity } } }',
        variables: { contentHash: uploadContentHash },
        variablesFromResponse: {
          fileId: '/data/uploadAppFile/fileId',
        },
        requiredMatches: [
          {
            path: '/data/appFiles/nodes/0/physicalDatabaseIdentity',
            value: customer.physicalIdentity,
          },
          {
            path: '/data/appFiles/nodes/0/contentHash',
            value: uploadContentHash,
          },
          { path: '/data/appFiles/nodes/0/tenantId', value: tenant.token },
        ],
        forbiddenMatches: physicalIdentityMatches(
          '/data/appFiles/nodes/0/physicalDatabaseIdentity',
          customer,
          otherCustomers
        ).forbiddenMatches,
        invariants: [
          exactInvariant(
            '/data/appFiles/nodes/*/physicalDatabaseIdentity',
            customer.physicalIdentity
          ),
          exactInvariant('/data/appFiles/nodes/*/tenantId', tenant.token),
          exactInvariant('/data/appFiles/nodes/*/contentHash', uploadContentHash),
        ],
      },
    }),
    fromBase('bulk-upsert', {
      query: 'mutation BulkUpsert($name: String!) { bulkUpsertBulkItems(input: { values: [{ name: $name, quantity: 1 }], onConflict: { constraint: BULK_ITEMS_NAME_KEY } }) { affectedCount returning { tenantId name physicalDatabaseIdentity } } }',
      variables: { name: `${customer.id}-${tenant.token}-bulk` },
      requiredMatches: [
        {
          path: '/data/bulkUpsertBulkItems/returning/0/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/bulkUpsertBulkItems/returning/0/name',
          value: `${customer.id}-${tenant.token}-bulk`,
        },
        {
          path: '/data/bulkUpsertBulkItems/returning/0/tenantId',
          value: tenant.token,
        },
      ],
      forbiddenMatches: physicalIdentityMatches(
        '/data/bulkUpsertBulkItems/returning/0/physicalDatabaseIdentity',
        customer,
        otherCustomers
      ).forbiddenMatches,
      invariants: [
        exactInvariant(
          '/data/bulkUpsertBulkItems/returning/*/physicalDatabaseIdentity',
          customer.physicalIdentity
        ),
        exactInvariant(
          '/data/bulkUpsertBulkItems/returning/*/tenantId',
          tenant.token
        ),
        exactInvariant(
          '/data/bulkUpsertBulkItems/returning/*/name',
          `${customer.id}-${tenant.token}-bulk`
        ),
      ],
    }),
    fromBase('realtime-tagged-update', {
      query: 'mutation RealtimeTaggedUpdate($payload: String!) { updateRealtimeItem(input: { id: 1, realtimeItemPatch: { payload: $payload } }) { realtimeItem { id tenantId physicalDatabaseIdentity payload } } }',
      variables: { payload: `${customer.id}-${tenant.token}-realtime` },
      requiredMatches: [
        {
          path: '/data/updateRealtimeItem/realtimeItem/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/updateRealtimeItem/realtimeItem/tenantId',
          value: tenant.token,
        },
        {
          path: '/data/updateRealtimeItem/realtimeItem/payload',
          value: `${customer.id}-${tenant.token}-realtime`,
        },
      ],
      forbiddenMatches: physicalIdentityMatches(
        '/data/updateRealtimeItem/realtimeItem/physicalDatabaseIdentity',
        customer,
        otherCustomers
      ).forbiddenMatches,
    }),
    fromBase('bound-function-invocation', {
      query: 'mutation BoundFunctionInvocation($payload: JSON!) { fixtureTask(input: { payload: $payload }) { invocationId status invocation { tenantId physicalDatabaseIdentity taskIdentifier } } }',
      variables: {
        payload: {
          tenant: tenant.id,
          customer: customer.id,
          source: 'physical-database-density',
        },
      },
      requiredMatches: [
        {
          path: '/data/fixtureTask/invocation/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/fixtureTask/invocation/tenantId',
          value: tenant.token,
        },
        {
          path: '/data/fixtureTask/invocation/taskIdentifier',
          value: `ctf.fixture.${tenant.id}`,
        },
      ],
      forbiddenMatches: physicalIdentityMatches(
        '/data/fixtureTask/invocation/physicalDatabaseIdentity',
        customer,
        otherCustomers
      ).forbiddenMatches,
    }),
    fromBase('security-context-read', {
      query: 'query SecurityContextRead { physicalDatabaseIdentity requestIdentity }',
      requiredMatches: [
        {
          path: '/data/physicalDatabaseIdentity',
          value: customer.physicalIdentity,
        },
        {
          path: '/data/requestIdentity',
          value: `${tenant.token}:${tenant.databaseId}`,
        },
      ],
      forbiddenMatches: [
        ...physicalIdentityMatches(
          '/data/physicalDatabaseIdentity',
          customer,
          otherCustomers
        ).forbiddenMatches,
        ...completeFixture.TENANTS.filter((candidate) => candidate.id !== tenant.id)
          .map((candidate) => ({
            path: '/data/requestIdentity',
            value: `${candidate.token}:${tenant.databaseId}`,
          })),
      ],
    }),
  ];
  if (baseByName.size > 0) {
    throw new Error(
      `PDCF_OPERATION_ORACLE_MISSING:${[...baseByName.keys()].sort().join(',')}`
    );
  }
  return operations;
};

const physicalCanariesFor = (customer, tenant, otherCustomers) =>
  completeFixture.canariesFor(tenant).map((candidate) => {
    if (candidate.name !== 'plugin-raw-sql') return candidate;
    const expectedTitle = `${tenant.token} español @${customer.physicalIdentity}`;
    const databaseCandidates = [customer, ...otherCustomers];
    return {
      ...candidate,
      requiredMatches: [{
        path: '/data/posts/nodes/0/localeStrings/title',
        value: expectedTitle,
      }],
      forbiddenMatches: [
        { path: '/data/posts/nodes/0/localeStrings/title', value: null },
        ...databaseCandidates.flatMap((databaseCustomer) =>
          completeFixture.TENANTS
          .filter((candidateTenant) => (
            candidateTenant.id !== tenant.id
            || databaseCustomer.id !== customer.id
          ))
          .map((candidateTenant) => ({
            path: '/data/posts/nodes/0/localeStrings/title',
            value: `${candidateTenant.token} español @${databaseCustomer.physicalIdentity}`,
          }))
        ),
      ],
      invariants: [exactInvariant(
        '/data/posts/nodes/*/localeStrings/title',
        expectedTitle
      )],
    };
  });

const makeFleet = ({ manifest, statuses, arms = DEFAULT_IDLE_ARMS, port = 3410 }) => ({
  version: 1,
  tenants: manifest.customers.map((customer) => {
    const otherCustomers = manifest.customers.filter((candidate) => candidate.id !== customer.id);
    const firstStatus = statusFor(statuses, arms[0].name, customer.id);
    if (firstStatus.physicalDatabase !== customer.database) {
      throw new Error(`PDCF_STATUS_DATABASE_MISMATCH:${customer.id}`);
    }
    return {
      id: customer.id,
      databases: [{
        id: `logical:${customer.id}`,
        physicalDatabase: customer.database,
        apis: completeFixture.TENANTS.map((tenant) => ({
          id: `api:${customer.id}:${tenant.id}`,
          runtimePoolIdentity: runtimePoolContractFingerprintFor(
            firstStatus,
            tenant.id,
          ),
          runtimePoolIdentities: Object.fromEntries(arms.map((arm) => [
            arm.name,
            runtimePoolContractFingerprintFor(
              statusFor(statuses, arm.name, customer.id),
              tenant.id,
            ),
          ])),
          physicalSchemas: [tenant.schema],
          routingLabels: [`${customer.id}-${tenant.id}`],
          realtime: true,
          surfaces: [`api-${tenant.id}`],
        })),
      }],
      surfaces: completeFixture.TENANTS.map((tenant) => ({
        name: `api-${tenant.id}`,
        buildContract: graphileBuildContractFingerprintFor(firstStatus, tenant.id),
        buildContracts: Object.fromEntries(arms.map((arm) => [
          arm.name,
          graphileBuildContractFingerprintFor(
            statusFor(statuses, arm.name, customer.id),
            tenant.id,
          ),
        ])),
        url: `http://127.0.0.1:{port}/customer/${customer.id}/tenant/${tenant.id}/graphql`,
        headers: { 'accept-language': 'es' },
        warmup: {
          name: 'warm-physical-database-identity',
          capability: 'graphile-generated',
          query: 'query WarmPhysicalDatabaseIdentity { physicalDatabaseIdentity }',
          ...physicalIdentityMatches(
            '/data/physicalDatabaseIdentity',
            customer,
            otherCustomers
          ),
        },
        operations: physicalOperationsFor(customer, tenant, otherCustomers),
        realtime: realtimeProbe(customer, tenant, otherCustomers),
        canaries: [
          ...physicalCanariesFor(customer, tenant, otherCustomers),
          physicalCanary(customer, otherCustomers),
        ],
      })),
    };
  }),
});

const makeCacheCapacityProofByHeapMiB = ({
  cacheCalibration,
  databaseContractFingerprint,
  introspectionMode = 'scoped-required',
  tenantCounts,
  tenantCountsByHeapMiB,
  heapMiB,
  heapLimitBytesByHeapMiB,
}) => {
  const countMatrix = validateCustomerCountMatrix({
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
  });
  const calibration = validateCacheCalibration(cacheCalibration, {
    databaseContractFingerprint,
    introspectionMode,
  });
  return Object.fromEntries(heapMiB.map((configuredHeapMiB) => {
    const requiredResidentInstances = Math.max(
      ...countMatrix.byHeap[String(configuredHeapMiB)]
    ) * completeFixture.TENANTS.length;
    const heapLimitBytes = heapLimitBytesByHeapMiB?.[String(configuredHeapMiB)];
    if (!Number.isSafeInteger(heapLimitBytes) || heapLimitBytes <= 0) {
      throw new Error(`PDCF_HEAP_LIMIT_REQUIRED:${configuredHeapMiB}`);
    }
    const budgetCapacity = computeCalibratedCapacity(
      heapLimitBytes,
      calibration.configured,
    );
    if (budgetCapacity < requiredResidentInstances) {
      throw new Error(
        `PDCF_CALIBRATED_CAPACITY_INSUFFICIENT:${configuredHeapMiB}:${budgetCapacity}:${requiredResidentInstances}`
      );
    }
    return [String(configuredHeapMiB), {
      calibrationId: calibration.calibrationId,
      expectedHeapLimitBytes: heapLimitBytes,
      budgetCapacity,
      configuredResidentCapacity: budgetCapacity,
      requiredResidentInstances,
      residentHeadroomInstances: budgetCapacity - requiredResidentInstances,
      admissionMode: QUALIFYING_CACHE_ADMISSION_MODE,
      capacityRefusalReason: 'resident_capacity',
      capacityResponseCode: 'GRAPHILE_BUILD_RESIDENT_CAPACITY',
      preservesExistingResidentsAtCapacity: true,
      safetyFactor: calibration.safetyFactor,
      measured: calibration.measured,
      configured: calibration.configured,
      sourceResultSha256: calibration.sources.map((source) => source.sourceSha256),
    }];
  }));
};

const makePlan = ({
  manifestFile,
  secretsFile,
  postgresContainer,
  commit,
  entrySha256,
  lockfileSha256,
  arms = DEFAULT_IDLE_ARMS,
  basePort = 3410,
  heapMiB = [1024, 2048, 4096],
  tenantCounts,
  tenantCountsByHeapMiB,
  repetitions = 3,
  durationSec = 900,
  introspectionMode = 'scoped-required',
  databaseContractFingerprint,
  blueprintCompatibilityFingerprint,
  manifestSha256,
  provisionClone,
  cacheCalibration,
  heapLimitBytesByHeapMiB,
  cacheCapacityByHeapMiB,
  postgresContainerTemplateFile,
  postgresContainerTemplateSha256,
}) => {
  if (
    !postgresContainer
    || !postgresContainerTemplateFile
    || !/^sha256:[a-f0-9]{64}$/.test(postgresContainerTemplateSha256 ?? '')
    || !commit
    || !entrySha256
    || !lockfileSha256
  ) {
    throw new Error('PDCF_PLAN_PROVENANCE_REQUIRED');
  }
  validateMeasurementProvisionClone(provisionClone);
  if (
    !/^sha256:[a-f0-9]{64}$/.test(databaseContractFingerprint ?? '')
    || !/^sha256:[a-f0-9]{64}$/.test(blueprintCompatibilityFingerprint ?? '')
    || !/^sha256:[a-f0-9]{64}$/.test(manifestSha256 ?? '')
  ) {
    throw new Error('PDCF_PLAN_COMPATIBILITY_FINGERPRINT_REQUIRED');
  }
  const countMatrix = validateCustomerCountMatrix({
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
  });
  const calibration = validateCacheCalibration(cacheCalibration, {
    databaseContractFingerprint,
    introspectionMode,
  });
  const computedCapacityByHeapMiB = makeCacheCapacityProofByHeapMiB({
    cacheCalibration: calibration,
    databaseContractFingerprint,
    introspectionMode,
    tenantCounts,
    tenantCountsByHeapMiB,
    heapMiB,
    heapLimitBytesByHeapMiB,
  });
  if (
    cacheCapacityByHeapMiB
    && JSON.stringify(cacheCapacityByHeapMiB) !== JSON.stringify(computedCapacityByHeapMiB)
  ) {
    throw new Error('PDCF_CACHE_CAPACITY_PROOF_MISMATCH');
  }
  const calibrationByHeapMiB = cacheCapacityByHeapMiB ?? computedCapacityByHeapMiB;
  return {
    version: 1,
    fleetFile: 'fleet.json',
    artifactDir: '../artifacts',
    arms: arms.map((arm, index) => {
      const port = basePort + index;
      const poolIdentitiesPerCustomer = completeFixture.TENANTS.length
        + (notificationModeForArm(arm) === 'shared-exact' ? 1 : 0);
      return {
        name: arm.name,
        commit,
        cwd: REPO_ROOT,
        command: [
          'node',
          '--expose-gc',
          path.join(FIXTURE_DIR, 'server.cjs'),
          '--manifest', '{postgresManifestFile}',
          '--secrets', '{postgresSecretsFile}',
          '--customers', '{tenantCount}',
          '--host', '127.0.0.1',
          '--port', '{port}',
          '--arm', arm.name,
          '--mode', '{mode}',
          '--introspection-client-release-mode', 'destroy',
          '--runtime-pool-max', String(runtimePoolMaxForArm(arm)),
          '--runtime-pool-max-uses', runtimePoolMaxUsesForArm(arm) == null
            ? 'unlimited'
            : String(runtimePoolMaxUsesForArm(arm)),
          '--realtime-notification-mode', notificationModeForArm(arm),
          '--realtime-cursor-poll-ms', String(cursorPollMsForArm(arm)),
          '--realtime-cursor-heartbeat-ms', String(cursorHeartbeatMsForArm(arm)),
          '--enable-realtime', 'true',
          '--expected-database-contract', databaseContractFingerprint,
          '--blueprint-compatibility', blueprintCompatibilityFingerprint,
          '--expected-manifest-sha256', '{postgresManifestSha256}',
          '--run-purpose', 'measurement',
          '--clone-id', '{postgresCloneId}',
        ],
        port,
        readinessUrl: 'http://127.0.0.1:{port}/healthz',
        memoryUrl: 'http://127.0.0.1:{port}/debug/memory',
        retainedHeapCheckpointUrl:
          'http://127.0.0.1:{port}/__cperf/retained-memory-checkpoint',
        postWarmupUrl: 'http://127.0.0.1:{port}/__cperf/post-warmup',
        postgresContainer,
        requirePostgresCgroupV2: true,
        postgresRunAttestation: {
          command: [
            'node',
            path.join(FIXTURE_DIR, 'measurement-attestation.cjs'),
            '--manifest', '{postgresManifestFile}',
            '--secrets', '{postgresSecretsFile}',
            '--postgres-container', postgresContainer,
            '--container-template', postgresContainerTemplateFile,
            '--expected-container-template-sha256',
            postgresContainerTemplateSha256,
            '--arm', '{arm}',
            '--heap-mib', '{heapMiB}',
            '--customers', '{tenantCount}',
            '--repetition', '{repetition}',
            '--run-order-index', '{runOrderIndex}',
            '--plan-sha256', '{planSha256}',
            '--fleet-sha256', '{fleetSha256}',
            '--not-before-epoch-ms', '{notBeforeEpochMs}',
            '--out', '{attestationFile}',
          ],
          prepareCommand: [
            'node',
            path.join(FIXTURE_DIR, 'prepare-measurement-run.cjs'),
            '--container-template', postgresContainerTemplateFile,
            '--expected-container-template-sha256',
            postgresContainerTemplateSha256,
            '--manifest-template', manifestFile,
            '--secrets-template', secretsFile,
            '--expected-manifest-template-sha256', manifestSha256,
            '--artifact-dir', '{postgresFixtureDir}',
            '--arm', '{arm}',
            '--heap-mib', '{heapMiB}',
            '--customers', '{tenantCount}',
            '--repetition', '{repetition}',
            '--run-order-index', '{runOrderIndex}',
          ],
          timeoutMs: 900_000,
        },
        introspectionMode,
        v8Profile: arm.v8Profile ?? 'stock',
        startupTimeoutMs: 600_000,
        entrySha256,
        lockfileSha256,
        env: {
          GRAPHILE_BUILD_MAX_CONCURRENCY: '1',
          GRAPHILE_BUILD_CONCURRENCY: '1',
          GRAPHILE_BUILD_QUEUE_MAX: '64',
          // Keep ambient code-loading hooks out of the measured child too;
          // the harness adds only the attested heap limit to NODE_OPTIONS.
          NODE_OPTIONS: '',
          NODE_PATH: '',
          // Runtime pools are exact per surface. Shared realtime adds one exact
          // notification pool identity per physical customer, even though that
          // identity owns only one backend for all of the customer's surfaces.
          PG_CACHE_MAX: String(
            Math.max(...countMatrix.all) * poolIdentitiesPerCustomer + 8
          ),
          PG_POOL_IDLE_TIMEOUT_MS: String(arm.idleTimeoutMs),
          // Control and incidental pools must not change shape with the arm.
          // Runtime pools receive their capacity through the explicit option.
          PG_POOL_MAX: String(PROCESS_GLOBAL_POOL_MAX),
          // maxUses is an exact runtime-pool option; ambient, control, and
          // notification pools remain reusable in every arm.
          PG_POOL_MAX_USES: '0',
          ...(preparedStatementCacheSizeForArm(arm) == null ? {} : {
            DATAPLAN_PG_PREPARED_STATEMENT_CACHE_SIZE:
              String(preparedStatementCacheSizeForArm(arm)),
          }),
        },
        envByHeapMiB: Object.fromEntries(Object.entries(calibrationByHeapMiB).map(
          ([configuredHeapMiB, proof]) => [configuredHeapMiB, {
            GRAPHILE_CACHE_MAX: String(proof.configuredResidentCapacity),
            GRAPHILE_CACHE_ADMISSION_MODE: proof.admissionMode,
            GRAPHILE_CACHE_INSTANCE_HEAP_BYTES:
              String(proof.configured.instanceHeapBytes),
            GRAPHILE_CACHE_SERVER_RESERVE_BYTES:
              String(proof.configured.serverReserveBytes),
            GRAPHILE_CACHE_BUILD_RESERVE_BYTES:
              String(proof.configured.buildReserveBytes),
            GRAPHILE_CACHE_RSS_BUILD_RESERVE_BYTES:
              String(proof.configured.rssBuildReserveBytes),
            GRAPHILE_CACHE_CALIBRATION_ID: proof.calibrationId,
            GRAPHQL_CPERF_RETAINED_HEAP_ENABLED: 'true',
          }]
        )),
        cacheCalibrationByHeapMiB: calibrationByHeapMiB,
      };
    }),
    heapMiB,
    ...(tenantCounts == null ? {} : { tenantCounts }),
    ...(tenantCountsByHeapMiB == null ? {} : { tenantCountsByHeapMiB }),
    repetitions,
    runOrderSeed: `${FIXTURE_ID}:${manifestFile}:${calibration.calibrationId}`,
    cacheCalibration: calibration,
    requiredCapabilities: [...completeFixture.REQUIRED_CAPABILITIES],
    requiredCanaries: [
      ...completeFixture.REQUIRED_CANARIES,
      PHYSICAL_DATABASE_CANARY,
    ],
    workload: {
      durationSec,
      rpsPerTenant: 0.2,
      minWorkloadRequestsPerSurface: 10,
      requestTimeoutMs: 30_000,
      maxInFlight: 64,
      canaryIntervalSec: 60,
      periodicCanarySchedule: 'rotating-one',
      canaryConcurrency: 16,
      warmupTimeoutMs: 300_000,
      warmupTimeoutPerSurfaceMs: 45_000,
      warmupConcurrency: 1,
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
      requireFreshPostgresRunAttestation: true,
      requirePhysicalDatabaseTelemetry: true,
      requireConclusiveCanaries: true,
      requireCompletePeriodicCanaryCoverage: true,
      requireConclusiveOperationOracles: true,
      requireExplicitCustomerTopology: true,
      requireRetainedMemoryCheckpoints: true,
      requiredCacheAdmissionMode: QUALIFYING_CACHE_ADMISSION_MODE,
    },
    ...(repetitions >= 3 && [1024, 2048, 4096].every((heap) => heapMiB.includes(heap))
      ? {
        qualification: {
          baselineArm: arms[0].name,
          requiredHeapMiB: [1024, 2048, 4096],
          minimumRepetitions: 3,
        },
      }
      : {}),
  };
};

const atomicWriteJson = (file, value, mode = 0o644) => {
  const absolute = path.resolve(file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.renameSync(temporary, absolute);
  fs.chmodSync(absolute, mode);
};

module.exports = {
  DEFAULT_IDLE_ARMS,
  DENSITY_TUNING_ARMS,
  FIXTURE_DIR,
  FIXTURE_ID,
  PHYSICAL_DATABASE_CANARY,
  PROCESS_GLOBAL_POOL_MAX,
  QUALIFYING_CACHE_ADMISSION_MODE,
  REPO_ROOT,
  atomicWriteJson,
  loadProvision,
  makeSecretResolver,
  makeCustomers,
  makeFleet,
  makeCacheCapacityProofByHeapMiB,
  makePlan,
  cursorHeartbeatMsForArm,
  cursorPollMsForArm,
  notificationModeForArm,
  preparedStatementCacheSizeForArm,
  runtimePoolMaxForArm,
  runtimePoolMaxUsesForArm,
  strictIdentifier,
  validateCustomerCountMatrix,
  validateCustomerCountRamp,
  validateProvisionManifest,
  validateSecrets,
};
