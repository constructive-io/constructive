import { toRedactedErrorSample } from './artifacts';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  RedactedErrorSample,
  RequestOutcome,
  RequestProfile,
  RuntimeOperationProfile,
} from './types';

export const DEFAULT_DATABASE_ID = '028752cb-510b-1438-2f39-64534bd1cbd7';
export const CONSTRUCTIVE_LOCAL_SEED_PATH =
  process.env.PERF_CONSTRUCTIVE_LOCAL_PATH ||
  '/Users/zeta/Projects/interweb/src/agents/constructive-db/services/constructive-local';
export const CONSTRUCTIVE_SCHEMAS = ['constructive_public'];
export const META_SCHEMAS = [
  'services_public',
  'metaschema_public',
  'metaschema_modules_public',
  'constructive_auth_public',
];
export const SERVICES_SCHEMATA = 'services_public,metaschema_public';
export const MODULES_SCHEMATA = 'metaschema_modules_public';
export const PUBLIC_HOST = 'api.localhost';
export const PRIVATE_API_NAME = 'private';
export const PRIVATE_SCHEMATA = SERVICES_SCHEMATA;

export interface GraphqlHttpResult<T = any> {
  status: number;
  body: {
    data?: T;
    errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>;
  };
  text?: string;
}

export const executeGraphql = async <T = any>(
  context: BenchmarkContext,
  input: {
    query: string;
    variables?: Record<string, unknown>;
    headers?: Record<string, string>;
    surface?: 'public' | 'private';
  }
): Promise<GraphqlHttpResult<T>> => {
  const request = input.surface === 'private' && context.privateRequest
    ? context.privateRequest
    : context.conn.request;
  let req = request
    .post('/graphql')
    .set('Content-Type', 'application/json');

  for (const [key, value] of Object.entries(input.headers || {})) {
    req = req.set(key, value);
  }

  const response = await req.send({ query: input.query, variables: input.variables });
  return {
    status: response.status,
    body: response.body || {},
    text: response.text,
  };
};

export const metaHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Meta-Schema': 'true',
});

export const privateApiHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Api-Name': PRIVATE_API_NAME,
});

export const privateSchemataHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Schemata': PRIVATE_SCHEMATA,
});

export const privateServicesHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Schemata': SERVICES_SCHEMATA,
});

export const privateModulesHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Schemata': MODULES_SCHEMATA,
});

export const publicHostHeaders = (host = PUBLIC_HOST): Record<string, string> => ({ Host: host });

const metadataQuery = `query PerfMetadataRead {
  databases(first: 3) { nodes { id name } }
  schemas(first: 5) { nodes { id name schemaName isPublic } }
  apis(first: 5) { nodes { id name isPublic databaseId } }
}`;

const modulesQuery = `query PerfModulesRead($first: Int!) {
  databaseProvisionModules(first: $first) { nodes { id status databaseId completedAt } }
}`;

export const buildPrivateOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'private-services-metadata',
    name: 'private.services.metadata',
    weight: 5,
    workloadProfile,
    description: 'Read Constructive services metadata through private direct schema routing.',
    mutates: false,
    compatibleRequestProfileIds: ['private-services', 'private-meta'],
    query: metadataQuery,
  },
  {
    id: 'private-typename',
    name: 'private.typename',
    weight: 2,
    workloadProfile,
    description: 'Tiny private schema sanity query.',
    mutates: false,
    compatibleRequestProfileIds: ['private-services', 'private-modules', 'private-meta'],
    query: '{ __typename }',
  },
  {
    id: 'private-modules-dbpm-read',
    name: 'private.modules.dbpmRead',
    weight: 3,
    workloadProfile,
    description: 'Read DBPM module records through private modules schema routing.',
    mutates: false,
    compatibleRequestProfileIds: ['private-modules'],
    query: modulesQuery,
    variables: { first: 3 },
  },
];

export const buildPublicOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'public-business-list',
    name: 'public.business.list',
    weight: 8,
    workloadProfile,
    description: 'List benchmark-owned DBPM business table rows through public host routing.',
    mutates: false,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const listField = requestProfile.metadata.listField;
      return typeof listField === 'string' && listField
        ? `query PerfPublicBusinessList($first: Int!) { ${listField}(first: $first) { nodes { id label } } }`
        : '{ __typename }';
    },
    variables: { first: 5 },
  },
  {
    id: 'public-typename',
    name: 'public.typename',
    weight: 2,
    workloadProfile,
    description: 'Tiny public route sanity query.',
    mutates: false,
    query: '{ __typename }',
  },
];

export const buildOperationBag = (operations: RuntimeOperationProfile[]): RuntimeOperationProfile[] => {
  const bag: RuntimeOperationProfile[] = [];
  for (const operation of operations) {
    const weight = Math.max(1, Math.floor(operation.weight));
    for (let i = 0; i < weight; i += 1) bag.push(operation);
  }
  return bag;
};

export const compatibleOperationsFor = (
  requestProfile: RequestProfile,
  operations: RuntimeOperationProfile[]
): RuntimeOperationProfile[] =>
  operations.filter(
    (operation) =>
      !operation.compatibleRequestProfileIds || operation.compatibleRequestProfileIds.includes(requestProfile.id)
  );

export const executeOperation = async (input: {
  context: BenchmarkContext;
  requestProfile: RequestProfile;
  operation: RuntimeOperationProfile;
  sequence: number;
  config: PerfRunConfig;
  matrixCase: MatrixCase;
}): Promise<RequestOutcome> => {
  const { context, requestProfile, operation, sequence, config, matrixCase } = input;
  const started = performance.now();
  let response: GraphqlHttpResult | undefined;
  try {
    const variables = operation.buildVariables
      ? operation.buildVariables({ sequence, requestProfile, config, matrixCase })
      : operation.variables;
    const query = operation.buildQuery
      ? operation.buildQuery({ sequence, requestProfile, config, matrixCase })
      : operation.query;
    response = await executeGraphql(context, {
      query,
      variables,
      headers: requestProfile.headers,
    });
    const latencyMs = performance.now() - started;
    const graphqlErrors = response.body?.errors?.length ?? 0;
    const ok = response.status >= 200 && response.status < 300 && graphqlErrors === 0;
    const error = ok
      ? undefined
      : toRedactedErrorSample(response.body?.errors || response.text || `HTTP ${response.status}`, {
          operation: operation.name,
          requestProfileId: requestProfile.id,
          status: response.status,
        }) as RedactedErrorSample;

    return {
      ok,
      latencyMs,
      operation: operation.name,
      requestProfileId: requestProfile.id,
      status: response.status,
      unexpectedGraphqlErrors: graphqlErrors,
      error,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: performance.now() - started,
      operation: operation.name,
      requestProfileId: requestProfile.id,
      unexpectedGraphqlErrors: 0,
      error: toRedactedErrorSample(error, {
        operation: operation.name,
        requestProfileId: requestProfile.id,
      }) as RedactedErrorSample,
    };
  }
};

export const responseHasUnexpectedErrors = (response: GraphqlHttpResult): boolean =>
  response.status < 200 || response.status >= 300 || Boolean(response.body?.errors?.length);

export const responseErrorSample = (
  response: GraphqlHttpResult,
  input: { operation?: string; requestProfileId?: string }
): RedactedErrorSample =>
  toRedactedErrorSample(response.body?.errors || response.text || `HTTP ${response.status}`, {
    ...input,
    status: response.status,
  }) as RedactedErrorSample;
