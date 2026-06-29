import { toRedactedErrorSample } from './artifacts';
import {
  DEFAULT_DATABASE_ID,
  executeGraphql,
  PUBLIC_HOST,
  publicHostHeaders,
  responseErrorSample,
  responseHasUnexpectedErrors,
} from './operations';
import { buildPublicOperationProfiles } from './operations';
import type {
  BenchmarkContext,
  DbpmProvisionResult,
  MatrixCase,
  PerfRunConfig,
  RedactedErrorSample,
  RequestProfile,
} from './types';

interface ApiNode {
  id: string;
  databaseId: string;
  name: string;
  dbname?: string;
  isPublic: boolean;
  roleName?: string;
  anonRole?: string;
}

interface DomainNode {
  id: string;
  databaseId: string;
  apiId?: string;
  subdomain?: string | null;
  domain?: string | null;
}

interface ApiSchemaNode {
  id: string;
  databaseId: string;
  apiId: string;
  schemaId: string;
}

interface ServicesSnapshot {
  apis?: { nodes: ApiNode[] };
  domains?: { nodes: DomainNode[] };
  apiSchemas?: { nodes: ApiSchemaNode[] };
}

const servicesSnapshotQuery = `query PerfServicesSnapshot($first: Int!) {
  apis(first: $first) { nodes { id databaseId name dbname isPublic roleName anonRole } }
  domains(first: $first) { nodes { id databaseId apiId subdomain domain } }
  apiSchemas(first: $first) { nodes { id databaseId apiId schemaId } }
}`;

const createApiMutation = `mutation PerfCreateApi($input: CreateApiInput!) {
  createApi(input: $input) { api { id databaseId name dbname isPublic roleName anonRole } }
}`;

const createDomainMutation = `mutation PerfCreateDomain($input: CreateDomainInput!) {
  createDomain(input: $input) { domain { id databaseId apiId subdomain domain } }
}`;

const createApiSchemaMutation = `mutation PerfCreateApiSchema($input: CreateApiSchemaInput!) {
  createApiSchema(input: $input) { apiSchema { id databaseId apiId schemaId } }
}`;

const hostFromDomain = (domain: DomainNode): string | null => {
  if (!domain.domain) return null;
  return domain.subdomain ? `${domain.subdomain}.${domain.domain}` : domain.domain;
};

const profileFromDomain = (domain: DomainNode, index: number, benchmarkOwned: boolean): RequestProfile | null => {
  const host = hostFromDomain(domain);
  if (!host) return null;
  return {
    id: benchmarkOwned ? `public-benchmark-${index}` : 'public-app',
    routingMode: 'public',
    routeKey: host,
    headers: publicHostHeaders(host),
    description: benchmarkOwned
      ? 'Benchmark-owned public host route provisioned for perf.'
      : 'Pre-seeded public app host route from simple-seed-services.',
    benchmarkOwned,
    metadata: {
      host,
      domainId: domain.id,
      apiId: domain.apiId,
      databaseId: domain.databaseId,
      source: benchmarkOwned ? 'graphql-provision' : 'simple-seed-services',
    },
  };
};

const publicProfilesFromSnapshot = (
  snapshot: ServicesSnapshot,
  config: PerfRunConfig,
  matrixCase: MatrixCase
): RequestProfile[] => {
  const domains = snapshot.domains?.nodes || [];
  const publicApis = new Map((snapshot.apis?.nodes || []).filter((api) => api.isPublic).map((api) => [api.id, api]));
  const casePrefix = `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}`.replace(/_/g, '-').toLowerCase();

  const benchmarkDomains = domains.filter((domain) => {
    const api = domain.apiId ? publicApis.get(domain.apiId) : undefined;
    const host = hostFromDomain(domain) || '';
    return Boolean(api && host.includes(casePrefix));
  });

  const defaultApp = domains.find((domain) => {
    const api = domain.apiId ? publicApis.get(domain.apiId) : undefined;
    return api?.name === 'app' && hostFromDomain(domain) === PUBLIC_HOST;
  });

  const profiles = benchmarkDomains
    .map((domain, index) => profileFromDomain(domain, index + 1, true))
    .filter(Boolean) as RequestProfile[];

  if (defaultApp) {
    profiles.unshift(profileFromDomain(defaultApp, 0, false)!);
  }

  return profiles;
};

const querySnapshotViaGraphql = async (
  context: BenchmarkContext,
  headers: Record<string, string>
): Promise<{ snapshot?: ServicesSnapshot; errors: RedactedErrorSample[]; unavailable: boolean }> => {
  const response = await executeGraphql<ServicesSnapshot>(context, {
    query: servicesSnapshotQuery,
    variables: { first: 200 },
    headers,
  });

  if (responseHasUnexpectedErrors(response)) {
    return {
      errors: [responseErrorSample(response, { operation: 'dbpm.snapshot' })],
      unavailable: true,
    };
  }

  return { snapshot: response.body.data, errors: [], unavailable: false };
};

const tryGraphqlProvision = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  snapshot: ServicesSnapshot;
  needed: number;
}): Promise<{ createdIds: string[]; errors: RedactedErrorSample[] }> => {
  const { context, matrixCase, config, snapshot, needed } = input;
  const errors: RedactedErrorSample[] = [];
  const createdIds: string[] = [];

  const appApi = (snapshot.apis?.nodes || []).find((api) => api.name === 'app' && api.isPublic);
  const appSchemas = (snapshot.apiSchemas?.nodes || []).filter((apiSchema) => apiSchema.apiId === appApi?.id);
  if (!appApi || appSchemas.length === 0) {
    return {
      createdIds,
      errors: [
        toRedactedErrorSample('Cannot provision public hosts: pre-seeded app API/schema metadata is unavailable.', {
          operation: 'dbpm.provision.graphql',
        }) as RedactedErrorSample,
      ],
    };
  }

  const casePrefix = `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}`.replace(/_/g, '-').toLowerCase();
  const dbname = appApi.dbname;
  if (!dbname) {
    return {
      createdIds,
      errors: [
        toRedactedErrorSample('Cannot provision public hosts: app API dbname is empty.', {
          operation: 'dbpm.provision.graphql',
        }) as RedactedErrorSample,
      ],
    };
  }

  for (let index = 0; index < needed; index += 1) {
    const apiName = `${casePrefix}-api-${index + 1}`.slice(0, 120);
    const createApi = await executeGraphql<{ createApi?: { api?: ApiNode } }>(context, {
      query: createApiMutation,
      variables: {
        input: {
          api: {
            databaseId: DEFAULT_DATABASE_ID,
            name: apiName,
            dbname,
            roleName: appApi.roleName || 'authenticated',
            anonRole: appApi.anonRole || 'anonymous',
            isPublic: true,
          },
        },
      },
      headers: publicHostHeaders(PUBLIC_HOST),
    });

    if (responseHasUnexpectedErrors(createApi) || !createApi.body.data?.createApi?.api?.id) {
      errors.push(responseErrorSample(createApi, { operation: 'dbpm.provision.createApi' }));
      break;
    }

    const api = createApi.body.data.createApi.api;
    createdIds.push(api.id);

    for (const apiSchema of appSchemas) {
      const createApiSchema = await executeGraphql(context, {
        query: createApiSchemaMutation,
        variables: {
          input: {
            apiSchema: {
              databaseId: DEFAULT_DATABASE_ID,
              apiId: api.id,
              schemaId: apiSchema.schemaId,
            },
          },
        },
        headers: publicHostHeaders(PUBLIC_HOST),
      });
      if (responseHasUnexpectedErrors(createApiSchema)) {
        errors.push(responseErrorSample(createApiSchema, { operation: 'dbpm.provision.createApiSchema' }));
        break;
      }
    }

    const createDomain = await executeGraphql<{ createDomain?: { domain?: DomainNode } }>(context, {
      query: createDomainMutation,
      variables: {
        input: {
          domain: {
            databaseId: DEFAULT_DATABASE_ID,
            apiId: api.id,
            subdomain: `${casePrefix}-${index + 1}`.slice(0, 120),
            domain: 'constructive.io',
          },
        },
      },
      headers: publicHostHeaders(PUBLIC_HOST),
    });

    if (responseHasUnexpectedErrors(createDomain) || !createDomain.body.data?.createDomain?.domain?.id) {
      errors.push(responseErrorSample(createDomain, { operation: 'dbpm.provision.createDomain' }));
      break;
    }
    createdIds.push(createDomain.body.data.createDomain.domain.id);
  }

  return { createdIds, errors };
};

export const provisionDbpmPublic = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
}): Promise<DbpmProvisionResult> => {
  const { context, matrixCase, config } = input;
  const errors: RedactedErrorSample[] = [];
  const warnings: string[] = [];

  // The server-test seed establishes one public app host before the benchmark
  // server starts. That satisfies tiny public smoke without mutating shared
  // metadata during preflight. Larger k still requires actual DBPM provisioning
  // and must fail clearly if the current GraphQL surface cannot provide it.
  if (matrixCase.scaleProfile.k <= 1) {
    return {
      ok: true,
      completed: true,
      source: 'fixture-preseeded',
      tenantCount: 1,
      publicHostCount: 1,
      apiCount: 1,
      businessTableCount: 1,
      requestProfiles: [
        {
          id: 'public-app',
          routingMode: 'public',
          routeKey: PUBLIC_HOST,
          headers: publicHostHeaders(PUBLIC_HOST),
          description: 'Pre-seeded public app host route from simple-seed-services.',
          benchmarkOwned: false,
          metadata: { host: PUBLIC_HOST, databaseId: DEFAULT_DATABASE_ID, source: 'simple-seed-services' },
        },
      ],
      operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
      benchmarkOwnedObjectIds: [],
      errors,
      warnings,
    };
  }

  // Public-mode servers cannot use X-Meta-Schema by design, so the first-version
  // helper attempts GraphQL DBPM mutations through the pre-seeded public host when
  // more profiles are required. If those mutations are not exposed by the current
  // product schema, the report fails clearly instead of fabricating tenants.
  const snapshotResult = await querySnapshotViaGraphql(context, publicHostHeaders(PUBLIC_HOST));

  if (!snapshotResult.snapshot) {
    warnings.push(
      'Public host does not expose DBPM metadata GraphQL; using the pre-seeded public app host as the first-version fixture-backed route profile.'
    );
    warnings.push(...snapshotResult.errors.map((error) => error.message));
    const fallbackProfile: RequestProfile = {
      id: 'public-app',
      routingMode: 'public',
      routeKey: PUBLIC_HOST,
      headers: publicHostHeaders(PUBLIC_HOST),
      description: 'Pre-seeded public app host route from simple-seed-services; DBPM metadata is not exposed on public app schema.',
      benchmarkOwned: false,
      metadata: { host: PUBLIC_HOST, databaseId: DEFAULT_DATABASE_ID, source: 'simple-seed-services' },
    };
    return {
      ok: matrixCase.scaleProfile.k <= 1,
      completed: matrixCase.scaleProfile.k <= 1,
      source: 'fixture-preseeded',
      tenantCount: 1,
      publicHostCount: 1,
      apiCount: 1,
      businessTableCount: 1,
      requestProfiles: [fallbackProfile],
      operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
      benchmarkOwnedObjectIds: [],
      errors: matrixCase.scaleProfile.k <= 1 ? [] : snapshotResult.errors,
      warnings,
    };
  }

  errors.push(...snapshotResult.errors);
  let snapshot = snapshotResult.snapshot;
  let requestProfiles = publicProfilesFromSnapshot(snapshot, config, matrixCase);
  let source: DbpmProvisionResult['source'] = 'fixture-preseeded';
  const needed = Math.max(0, matrixCase.scaleProfile.k - requestProfiles.length);
  const createdIds: string[] = [];

  if (needed > 0) {
    const provision = await tryGraphqlProvision({ context, matrixCase, config, snapshot, needed });
    createdIds.push(...provision.createdIds);
    errors.push(...provision.errors);
    source = provision.createdIds.length > 0 ? 'mixed' : 'unavailable';

    if (provision.createdIds.length > 0) {
      const refreshed = await querySnapshotViaGraphql(context, publicHostHeaders(PUBLIC_HOST));
      errors.push(...refreshed.errors);
      if (refreshed.snapshot) snapshot = refreshed.snapshot;
      requestProfiles = publicProfilesFromSnapshot(snapshot, config, matrixCase);
    }

    if (requestProfiles.length < matrixCase.scaleProfile.k) {
      warnings.push(
        `Requested k=${matrixCase.scaleProfile.k} public profiles but only ${requestProfiles.length} are reachable via current GraphQL surface.`
      );
    }
  }

  const publicApiIds = new Set((snapshot.apis?.nodes || []).filter((api) => api.isPublic).map((api) => api.id));
  const publicHostCount = (snapshot.domains?.nodes || []).filter((domain) => domain.apiId && publicApiIds.has(domain.apiId)).length;

  return {
    ok: errors.length === 0,
    completed: errors.length === 0,
    source,
    tenantCount: new Set(requestProfiles.map((profile) => String(profile.metadata.databaseId || DEFAULT_DATABASE_ID))).size,
    publicHostCount: requestProfiles.length || publicHostCount,
    apiCount: publicApiIds.size,
    businessTableCount: 1,
    requestProfiles,
    operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
    benchmarkOwnedObjectIds: createdIds,
    errors,
    warnings,
  };
};
