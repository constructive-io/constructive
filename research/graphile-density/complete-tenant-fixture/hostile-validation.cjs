'use strict';

const path = require('node:path');

const {
  FIXTURE_DIR,
  TENANTS,
  assertLoopbackBaseUrl,
  evaluateCanaryResponse,
  makeFleet,
  parseArgs,
  requireString,
} = require('./lib.cjs');
const { atomicWriteJson, validateServerStatus } = require('./generate-inputs.cjs');

const DIAGNOSTIC_TEXT_LIMIT = 512;
const CUSTOMER_ID_PATTERN = /^[a-z0-9-]+$/;

const requirePhysicalDatabaseIdentity = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('CTF_EXPECTED_PHYSICAL_DATABASE_IDENTITY_REQUIRED');
  }
  return value.trim();
};

const assertCustomerPathPrefix = (pathPrefix, expectedCustomerId) => {
  if (
    typeof expectedCustomerId !== 'string'
    || !CUSTOMER_ID_PATTERN.test(expectedCustomerId)
    || pathPrefix !== `/customer/${expectedCustomerId}`
  ) {
    throw new Error('CTF_CUSTOMER_PATH_PREFIX_MISMATCH');
  }
  return pathPrefix;
};

const requestUrl = (baseUrl, pathPrefix, pathname) =>
  `${baseUrl}${pathPrefix}${pathname}`;

const collectDiagnosticSecrets = (value, secrets = [], seen = new Set()) => {
  if (typeof value === 'string') {
    if (value.length >= 4) secrets.push(value);
    return secrets;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return secrets;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) collectDiagnosticSecrets(entry, secrets, seen);
  } else {
    for (const entry of Object.values(value)) collectDiagnosticSecrets(entry, secrets, seen);
  }
  return secrets;
};

const redactDiagnosticText = (value, secrets = []) => {
  let text = typeof value === 'string' ? value : String(value ?? '');
  text = text
    .replace(/\bbearer\s+[^\s,'"}]+/gi, 'Bearer [REDACTED]')
    .replace(/\b(postgres(?:ql)?):\/\/[^@\s/]+@/gi, '$1://[REDACTED]@')
    .replace(
      /((?:password|passwd|pwd|token|secret|api[-_]?key|authorization)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      '$1[REDACTED]',
    );
  for (const secret of [...new Set(secrets)].sort((left, right) => right.length - left.length)) {
    text = text.split(secret).join('[REDACTED]');
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, DIAGNOSTIC_TEXT_LIMIT);
};

const diagnosticCode = (value, fallback) => {
  const normalized = redactDiagnosticText(value ?? fallback)
    .replace(/[^A-Za-z0-9_.-]+/g, '_')
    .slice(0, 80);
  return normalized || fallback;
};

const diagnosticRequestTarget = (value) => {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return 'invalid-url';
  }
};

const graphqlOperationName = (operation) => {
  const declaredName = typeof operation?.name === 'string' ? operation.name : null;
  const parsedName = typeof operation?.query === 'string'
    ? /\b(?:query|mutation|subscription)\s+([_A-Za-z][_0-9A-Za-z]*)/.exec(operation.query)?.[1]
    : null;
  return diagnosticCode(declaredName ?? parsedName, 'anonymous-operation');
};

const requestJson = async (url, {
  method = 'GET',
  body,
  token,
  headers = {},
  fetchImpl = fetch,
} = {}) => {
  const secrets = collectDiagnosticSecrets({ body, token, headers });
  const target = diagnosticRequestTarget(url);
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      redirect: 'error',
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    const detail = redactDiagnosticText(
      error instanceof Error ? error.message : error,
      secrets,
    ) || 'transport-error';
    throw new Error(`CTF_HTTP_REQUEST_FAILED:${target}:${detail}`);
  }
  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const code = diagnosticCode(parsed?.error?.code, `HTTP_${response.status}`);
    const detail = redactDiagnosticText(parsed?.error?.message ?? '', secrets);
    throw new Error(
      `CTF_HTTP_FAILURE:${code}:status=${response.status}:target=${target}`
      + (detail ? `:message=${detail}` : ''),
    );
  }
  return parsed;
};

const postGraphql = async (
  baseUrl,
  pathPrefix,
  tenantId,
  operation,
  fetchImpl = fetch,
) => {
  const body = await requestJson(requestUrl(
    baseUrl,
    pathPrefix,
    `/tenant/${tenantId}/graphql`,
  ), {
    method: 'POST',
    headers: { 'accept-language': 'es' },
    body: {
      query: operation.query,
      variables: operation.variables ?? {},
    },
    fetchImpl,
  });
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    const first = body.errors[0] ?? {};
    const code = diagnosticCode(first?.extensions?.code, 'GRAPHQL_ERROR');
    const operationName = graphqlOperationName(operation);
    const secrets = collectDiagnosticSecrets(operation?.variables);
    const detail = redactDiagnosticText(first?.message ?? '', secrets) || 'no-message';
    const errorPath = Array.isArray(first?.path)
      ? first.path.map((entry) => diagnosticCode(entry, 'unknown')).join('.')
      : 'none';
    const location = Array.isArray(first?.locations) && first.locations.length > 0
      ? `${Number(first.locations[0]?.line) || 0}:${Number(first.locations[0]?.column) || 0}`
      : 'none';
    throw new Error(
      `CTF_GRAPHQL_FAILURE:${diagnosticCode(tenantId, 'unknown-tenant')}:${code}`
      + `:operation=${operationName}:path=${errorPath}:location=${location}`
      + `:errors=${body.errors.length}:message=${detail}`,
    );
  }
  if (!body || typeof body !== 'object' || !('data' in body)) {
    throw new Error(`CTF_GRAPHQL_RESPONSE_INVALID:${tenantId}`);
  }
  return body;
};

const assertPhysicalDatabaseIdentity = (
  observed,
  expectedPhysicalDatabaseIdentity,
  label,
) => {
  const expected = requirePhysicalDatabaseIdentity(expectedPhysicalDatabaseIdentity);
  if (observed !== expected) {
    throw new Error(
      `CTF_PHYSICAL_DATABASE_IDENTITY_MISMATCH:${diagnosticCode(label, 'unknown')}`,
    );
  }
};

const control = async (
  baseUrl,
  pathPrefix,
  token,
  action,
  tenant,
  expectedPhysicalDatabaseIdentity,
  fetchImpl,
) => {
  const response = await requestJson(requestUrl(baseUrl, pathPrefix, '/__ctf/control'), {
    method: 'POST',
    token,
    body: { action, ...(tenant ? { tenant } : {}) },
    fetchImpl,
  });
  assertPhysicalDatabaseIdentity(
    response?.physicalDatabaseIdentity,
    expectedPhysicalDatabaseIdentity,
    `${action}:${tenant ?? 'fleet'}`,
  );
  return response;
};

const identityOperation = {
  query: 'query HostileTenantIdentity { tenantIdentity requestIdentity physicalDatabaseIdentity }',
};

const physicalIdentityOperation = {
  query: 'query HostilePhysicalDatabaseIdentity { physicalDatabaseIdentity }',
};

const assertIdentity = (tenant, body, expectedPhysicalDatabaseIdentity) => {
  const expectedRequestIdentity = `${tenant.token}:${tenant.databaseId}`;
  if (
    body?.data?.tenantIdentity !== tenant.token
    || body?.data?.requestIdentity !== expectedRequestIdentity
  ) {
    throw new Error(`CTF_TENANT_IDENTITY_MISMATCH:${tenant.id}`);
  }
  assertPhysicalDatabaseIdentity(
    body?.data?.physicalDatabaseIdentity,
    expectedPhysicalDatabaseIdentity,
    `graphql-identity:${tenant.id}`,
  );
  const serialized = JSON.stringify(body);
  for (const other of TENANTS) {
    if (other.id !== tenant.id && serialized.includes(other.token)) {
      throw new Error(`CTF_CROSS_TENANT_TOKEN:${tenant.id}:${other.id}`);
    }
  }
};

const runHostileValidation = async ({
  baseUrl = 'http://127.0.0.1:3391',
  pathPrefix = '',
  expectedCustomerId,
  expectedPhysicalDatabaseIdentity,
  controlToken,
  arm = 'local-complete-tenant',
  mode = 'scoped-required',
  fetchImpl = fetch,
  outputFile,
} = {}) => {
  if (typeof controlToken !== 'string' || Buffer.byteLength(controlToken) < 32) {
    throw new Error('CTF_CONTROL_TOKEN_REQUIRED');
  }
  expectedPhysicalDatabaseIdentity = requirePhysicalDatabaseIdentity(
    expectedPhysicalDatabaseIdentity,
  );
  baseUrl = assertLoopbackBaseUrl(baseUrl);
  if (pathPrefix !== '' || expectedCustomerId !== undefined) {
    pathPrefix = assertCustomerPathPrefix(pathPrefix, expectedCustomerId);
  }
  const startedAt = new Date().toISOString();
  const checks = [];
  const record = (name, detail = {}) => checks.push({ name, passed: true, ...detail });
  const status = await requestJson(requestUrl(baseUrl, pathPrefix, '/__ctf/status'), {
    fetchImpl,
  });
  const contracts = validateServerStatus(status, { arm, mode });
  assertPhysicalDatabaseIdentity(
    status.physicalDatabase,
    expectedPhysicalDatabaseIdentity,
    'status',
  );
  if (status.controlAvailable !== true) throw new Error('CTF_CONTROL_ENDPOINT_UNAVAILABLE');
  record('runtime-boundary', {
    physicalIsolation: status.physicalIsolation,
    sharedRuntimePool: status.sharedRuntimePool,
  });

  const fleet = makeFleet({ arm, buildContracts: contracts });
  for (const tenantTarget of fleet.tenants) {
    const tenantId = tenantTarget.id.slice('complete-tenant-'.length);
    for (const canary of tenantTarget.surfaces[0].canaries) {
      const response = await postGraphql(
        baseUrl,
        pathPrefix,
        tenantId,
        canary,
        fetchImpl,
      );
      const result = evaluateCanaryResponse(canary, response);
      if (!result.conclusive || result.violation) {
        throw new Error(
          `CTF_CANARY_FAILED:${tenantId}:${canary.name}:${result.detail ?? 'inconclusive'}`,
        );
      }
      const physicalResponse = await postGraphql(
        baseUrl,
        pathPrefix,
        tenantId,
        physicalIdentityOperation,
        fetchImpl,
      );
      assertPhysicalDatabaseIdentity(
        physicalResponse?.data?.physicalDatabaseIdentity,
        expectedPhysicalDatabaseIdentity,
        `canary:${tenantId}:${canary.name}`,
      );
      record(`canary:${tenantId}:${canary.name}`);
    }
  }

  for (const tenant of TENANTS) {
    const poisoned = await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'poison',
      tenant.id,
      expectedPhysicalDatabaseIdentity,
      fetchImpl,
    );
    if (poisoned?.ok !== true) throw new Error(`CTF_POISON_PROBE_FAILED:${tenant.id}`);
    const response = await postGraphql(
      baseUrl,
      pathPrefix,
      tenant.id,
      identityOperation,
      fetchImpl,
    );
    assertIdentity(tenant, response, expectedPhysicalDatabaseIdentity);
    record(`checkout-sanitization:${tenant.id}`);

    const rollback = await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'rollback-savepoint',
      tenant.id,
      expectedPhysicalDatabaseIdentity,
      fetchImpl,
    );
    if (rollback?.ok !== true || rollback.observed !== tenant.databaseId) {
      throw new Error(`CTF_ROLLBACK_SAVEPOINT_FAILED:${tenant.id}`);
    }
    const afterRollback = await postGraphql(
      baseUrl,
      pathPrefix,
      tenant.id,
      identityOperation,
      fetchImpl,
    );
    assertIdentity(tenant, afterRollback, expectedPhysicalDatabaseIdentity);
    record(`rollback-savepoint:${tenant.id}`);

    const prepared = await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'prepared-reset',
      tenant.id,
      expectedPhysicalDatabaseIdentity,
      fetchImpl,
    );
    if (
      prepared?.ok !== true
      || prepared.first !== tenant.token
      || prepared.second !== `${tenant.token}:${tenant.databaseId}`
      || prepared.runtimeRole !== status.runtimeBindings?.[tenant.id]?.role
      || prepared.backend?.exact !== true
      || prepared.backend?.expected !== (
        status.runtimePoolMaxUses === 1 ? 'rotated-client' : 'same-client'
      )
      || prepared.backend?.observed !== prepared.backend?.expected
      || !Number.isSafeInteger(prepared.backend?.firstBackendPid)
      || !Number.isSafeInteger(prepared.backend?.secondBackendPid)
    ) {
      throw new Error(`CTF_PREPARED_RESET_FAILED:${tenant.id}`);
    }
    record(`prepared-statement-reset:${tenant.id}`, {
      backendBehavior: prepared.backend.observed,
      firstBackendPid: prepared.backend.firstBackendPid,
      secondBackendPid: prepared.backend.secondBackendPid,
    });

    const badRole = await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'bad-role-expected-failure',
      tenant.id,
      expectedPhysicalDatabaseIdentity,
      fetchImpl,
    );
    if (
      badRole?.ok !== true
      || badRole.rejectedCode !== 'GRAPHILE_UNSAFE_RUNTIME_ROLE'
    ) {
      throw new Error(`CTF_BAD_ROLE_ACCEPTED:${tenant.id}`);
    }
    record(`bad-role-expected-failure:${tenant.id}`);
  }

  const driftTenant = TENANTS[0];
  let driftApplied = false;
  try {
    const applied = await control(
      baseUrl,
      pathPrefix,
      controlToken,
      'drift-apply',
      driftTenant.id,
      expectedPhysicalDatabaseIdentity,
      fetchImpl,
    );
    if (applied?.ok !== true) throw new Error('CTF_SCHEMA_DRIFT_APPLY_FAILED');
    driftApplied = true;
    const driftResponse = await postGraphql(baseUrl, pathPrefix, driftTenant.id, {
      query: 'query DriftApplied { schemaEpoch physicalDatabaseIdentity __type(name: "Document") { fields { name } } }',
    }, fetchImpl);
    const driftFields = driftResponse?.data?.__type?.fields?.map((field) => field.name) ?? [];
    if (driftResponse?.data?.schemaEpoch !== 2 || !driftFields.includes('driftProbe')) {
      throw new Error('CTF_SCHEMA_DRIFT_NOT_REBUILT');
    }
    assertPhysicalDatabaseIdentity(
      driftResponse?.data?.physicalDatabaseIdentity,
      expectedPhysicalDatabaseIdentity,
      'schema-drift-applied',
    );
    record('schema-drift-apply-and-rebuild');
  } finally {
    if (driftApplied) {
      const reverted = await control(
        baseUrl,
        pathPrefix,
        controlToken,
        'drift-revert',
        driftTenant.id,
        expectedPhysicalDatabaseIdentity,
        fetchImpl,
      );
      if (reverted?.ok !== true) throw new Error('CTF_SCHEMA_DRIFT_REVERT_FAILED');
    }
  }
  const revertedResponse = await postGraphql(baseUrl, pathPrefix, driftTenant.id, {
    query: 'query DriftReverted { schemaEpoch physicalDatabaseIdentity __type(name: "Document") { fields { name } } }',
  }, fetchImpl);
  const revertedFields = revertedResponse?.data?.__type?.fields?.map((field) => field.name) ?? [];
  if (revertedResponse?.data?.schemaEpoch !== 1 || revertedFields.includes('driftProbe')) {
    throw new Error('CTF_SCHEMA_DRIFT_REVERT_NOT_REBUILT');
  }
  assertPhysicalDatabaseIdentity(
    revertedResponse?.data?.physicalDatabaseIdentity,
    expectedPhysicalDatabaseIdentity,
    'schema-drift-reverted',
  );
  record('schema-drift-revert-and-rebuild');

  const beforeConcurrent = await requestJson(
    requestUrl(baseUrl, pathPrefix, '/__ctf/status'),
    { fetchImpl },
  );
  assertPhysicalDatabaseIdentity(
    beforeConcurrent?.physicalDatabase,
    expectedPhysicalDatabaseIdentity,
    'before-concurrent-rebuild-status',
  );
  await control(
    baseUrl,
    pathPrefix,
    controlToken,
    'invalidate-all',
    null,
    expectedPhysicalDatabaseIdentity,
    fetchImpl,
  );
  await Promise.all(TENANTS.map(async (tenant) => {
    const response = await postGraphql(
      baseUrl,
      pathPrefix,
      tenant.id,
      identityOperation,
      fetchImpl,
    );
    assertIdentity(tenant, response, expectedPhysicalDatabaseIdentity);
  }));
  const afterConcurrent = await requestJson(
    requestUrl(baseUrl, pathPrefix, '/__ctf/status'),
    { fetchImpl },
  );
  assertPhysicalDatabaseIdentity(
    afterConcurrent?.physicalDatabase,
    expectedPhysicalDatabaseIdentity,
    'after-concurrent-rebuild-status',
  );
  if (afterConcurrent?.builds?.maxConcurrent !== 1) {
    throw new Error(`CTF_BUILD_SERIALIZATION_FAILED:${afterConcurrent?.builds?.maxConcurrent}`);
  }
  for (const tenant of TENANTS) {
    const before = beforeConcurrent?.builds?.byTenant?.[tenant.id] ?? 0;
    const after = afterConcurrent?.builds?.byTenant?.[tenant.id] ?? 0;
    if (after !== before + 1) {
      throw new Error(`CTF_CONCURRENT_REBUILD_COUNT_FAILED:${tenant.id}:${before}:${after}`);
    }
  }
  record('concurrent-build-serialization', { maxConcurrentBuilds: 1 });

  for (let iteration = 0; iteration < 10; iteration += 1) {
    for (const tenant of TENANTS) {
      const response = await postGraphql(
        baseUrl,
        pathPrefix,
        tenant.id,
        identityOperation,
        fetchImpl,
      );
      assertIdentity(tenant, response, expectedPhysicalDatabaseIdentity);
    }
  }
  record('prepared-and-connection-reuse', { rounds: 10, crossTenantTokens: 0 });

  const report = {
    version: 2,
    fixture: 'complete-tenant-abc-v1',
    startedAt,
    endedAt: new Date().toISOString(),
    arm,
    mode,
    pathPrefix,
    expectedCustomerId: expectedCustomerId ?? null,
    physicalDatabaseIdentity: expectedPhysicalDatabaseIdentity,
    passed: true,
    customerQualified: false,
    customerQualificationReason: 'hostile validation alone does not satisfy provider and workload gates',
    checks,
  };
  if (outputFile) atomicWriteJson(outputFile, report);
  return report;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const output = args.output
    ? path.resolve(requireString(args, 'output'))
    : path.join(FIXTURE_DIR, 'generated', 'hostile-validation.json');
  const report = await runHostileValidation({
    baseUrl: requireString(args, 'base-url', 'http://127.0.0.1:3391'),
    pathPrefix: args['path-prefix'] === undefined
      ? ''
      : requireString(args, 'path-prefix'),
    expectedCustomerId: args['customer-id'],
    expectedPhysicalDatabaseIdentity: requireString(
      args,
      'expected-physical-database-identity',
    ),
    controlToken: process.env.CTF_CONTROL_TOKEN,
    arm: requireString(args, 'arm', 'local-complete-tenant'),
    mode: requireString(args, 'mode', 'scoped-required'),
    outputFile: output,
  });
  process.stdout.write(`${JSON.stringify(report)}\n`);
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertCustomerPathPrefix,
  assertIdentity,
  assertPhysicalDatabaseIdentity,
  control,
  diagnosticRequestTarget,
  identityOperation,
  postGraphql,
  redactDiagnosticText,
  requestJson,
  runHostileValidation,
};
