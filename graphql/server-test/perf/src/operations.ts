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
export const CONSTRUCTIVE_SCHEMAS = ['constructive_public'];
export const META_SCHEMAS = [
  'services_public',
  'metaschema_public',
  'metaschema_modules_public',
  'constructive_auth_public',
];
export const SERVICES_SCHEMATA = 'services_public,metaschema_public';
export const MODULES_SCHEMATA = 'metaschema_modules_public';
export const PRIVATE_API_NAME = 'private';

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

export const privateServicesHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Schemata': SERVICES_SCHEMATA,
});

export const privateModulesHeaders = (): Record<string, string> => ({
  'X-Database-Id': DEFAULT_DATABASE_ID,
  'X-Schemata': MODULES_SCHEMATA,
});

export const publicHostHeaders = (host: string): Record<string, string> => ({ Host: host });

const stringMetadata = (requestProfile: RequestProfile, key: string): string | undefined => {
  const value = requestProfile.metadata[key];
  return typeof value === 'string' && value ? value : undefined;
};

const requiredStringMetadata = (requestProfile: RequestProfile, key: string): string => {
  const value = stringMetadata(requestProfile, key);
  if (!value) {
    throw new Error(`Request profile ${requestProfile.id} is missing ${key} metadata`);
  }
  return value;
};

const dataObject = (responseBody: unknown): Record<string, any> | undefined => {
  const body = responseBody as { data?: unknown } | undefined;
  return body?.data && typeof body.data === 'object' ? body.data as Record<string, any> : undefined;
};

const firstNodeId = (responseBody: unknown, fieldName: string): string | undefined => {
  const value = dataObject(responseBody)?.[fieldName]?.nodes?.[0]?.id;
  return typeof value === 'string' && value ? value : undefined;
};

const mutationNodeId = (responseBody: unknown, mutationField: string, nodeField: string): string | undefined => {
  const value = dataObject(responseBody)?.[mutationField]?.[nodeField]?.id;
  return typeof value === 'string' && value ? value : undefined;
};

const labelValue = (input: {
  sequence: number;
  requestProfile: RequestProfile;
  config: PerfRunConfig;
}): string => `${input.config.benchmarkOwnedPrefix}-${input.requestProfile.id}-${input.sequence}`;

const metadataQuery = `query PerfMetadataRead {
  databases(first: 3) { nodes { id name } }
  schemas(first: 5) { nodes { id name schemaName isPublic } }
  apis(first: 5) { nodes { id name isPublic databaseId } }
}`;

const modulesQuery = `query PerfModulesRead($first: Int!) {
  databaseProvisionModules(first: $first) { nodes { id status databaseId completedAt } }
}`;

const privateTypenameOperation = (workloadProfile: string, weight = 2): RuntimeOperationProfile => ({
  id: 'private-typename',
  name: 'private.typename',
  weight,
  workloadProfile,
  description: 'Tiny private schema sanity query.',
  mutates: false,
  query: '{ __typename }',
});

const buildMetadataReadPrivateOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
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
    ...privateTypenameOperation(workloadProfile),
    compatibleRequestProfileIds: ['private-services', 'private-modules', 'private-meta'],
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

export const buildPrivateOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => {
  if (workloadProfile === 'cache-key-shared') {
    return [
      {
        id: 'private-services-metadata',
        name: 'private.services.metadata',
        weight: 8,
        workloadProfile,
        description: 'Read Constructive services metadata while varying svc_key only.',
        mutates: false,
        query: metadataQuery,
      },
      privateTypenameOperation(workloadProfile, 2),
    ];
  }

  if (workloadProfile === 'cache-key-distinct') {
    return [privateTypenameOperation(workloadProfile, 10)];
  }

  return buildMetadataReadPrivateOperationProfiles(workloadProfile);
};

const buildPublicReadOnlyOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'public-business-list',
    name: 'public.business.list',
    weight: 8,
    workloadProfile,
    description: 'List benchmark-owned DBPM business table rows through public host routing.',
    mutates: false,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const listField = requiredStringMetadata(requestProfile, 'listField');
      return `query PerfPublicBusinessList($first: Int!) { ${listField}(first: $first) { nodes { id label } } }`;
    },
    variables: { first: 5 },
    extractRowId: ({ responseBody, requestProfile }) =>
      firstNodeId(responseBody, requiredStringMetadata(requestProfile, 'listField')),
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

const buildPublicCrudOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'public-business-create',
    name: 'public.business.create',
    weight: 2,
    workloadProfile,
    description: 'Create benchmark-owned DBPM business table rows through public host routing.',
    mutates: true,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const createField = requiredStringMetadata(requestProfile, 'createField');
      const createInputType = requiredStringMetadata(requestProfile, 'createInputType');
      const nodeField = requiredStringMetadata(requestProfile, 'nodeField');
      return `mutation PerfPublicBusinessCreate($input: ${createInputType}!) { ${createField}(input: $input) { ${nodeField} { id label } } }`;
    },
    buildVariables: ({ sequence, requestProfile, config }) => {
      const nodeField = requiredStringMetadata(requestProfile, 'nodeField');
      return {
        input: {
          [nodeField]: {
            label: labelValue({ sequence, requestProfile, config }),
          },
        },
      };
    },
    producesRowId: true,
    extractRowId: ({ responseBody, requestProfile }) =>
      mutationNodeId(
        responseBody,
        requiredStringMetadata(requestProfile, 'createField'),
        requiredStringMetadata(requestProfile, 'nodeField')
      ),
  },
  {
    id: 'public-business-get-by-id',
    name: 'public.business.getById',
    weight: 4,
    workloadProfile,
    description: 'Read a benchmark-owned DBPM business row by id through public host routing.',
    mutates: false,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const listField = requiredStringMetadata(requestProfile, 'listField');
      return `query PerfPublicBusinessGetById($id: UUID!) { ${listField}(where: { id: { equalTo: $id } }, first: 1) { nodes { id label } } }`;
    },
    buildVariables: ({ rowId }) => ({ id: rowId }),
    requiresExistingRow: true,
    extractRowId: ({ responseBody, requestProfile }) =>
      firstNodeId(responseBody, requiredStringMetadata(requestProfile, 'listField')),
  },
  {
    id: 'public-business-update-by-id',
    name: 'public.business.updateById',
    weight: 2,
    workloadProfile,
    description: 'Update a benchmark-owned DBPM business row by id through public host routing.',
    mutates: true,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const updateField = requiredStringMetadata(requestProfile, 'updateField');
      const updateInputType = requiredStringMetadata(requestProfile, 'updateInputType');
      const nodeField = requiredStringMetadata(requestProfile, 'nodeField');
      return `mutation PerfPublicBusinessUpdateById($input: ${updateInputType}!) { ${updateField}(input: $input) { ${nodeField} { id label } } }`;
    },
    buildVariables: ({ sequence, rowId, requestProfile, config }) => {
      const patchField = requiredStringMetadata(requestProfile, 'patchField');
      return {
        input: {
          id: rowId,
          [patchField]: {
            label: labelValue({ sequence, requestProfile, config }),
          },
        },
      };
    },
    requiresExistingRow: true,
    producesRowId: true,
    extractRowId: ({ responseBody, requestProfile }) =>
      mutationNodeId(
        responseBody,
        requiredStringMetadata(requestProfile, 'updateField'),
        requiredStringMetadata(requestProfile, 'nodeField')
      ),
  },
  {
    id: 'public-business-list-recent',
    name: 'public.business.listRecent',
    weight: 2,
    workloadProfile,
    description: 'List recent benchmark-owned DBPM business table rows through public host routing.',
    mutates: false,
    query: '{ __typename }',
    buildQuery: ({ requestProfile }) => {
      const listField = requiredStringMetadata(requestProfile, 'listField');
      return `query PerfPublicBusinessListRecent($first: Int!) { ${listField}(first: $first) { nodes { id label } } }`;
    },
    variables: { first: 10 },
    extractRowId: ({ responseBody, requestProfile }) =>
      firstNodeId(responseBody, requiredStringMetadata(requestProfile, 'listField')),
  },
  {
    id: 'public-typename',
    name: 'public.typename',
    weight: 1,
    workloadProfile,
    description: 'Tiny public route sanity query.',
    mutates: false,
    query: '{ __typename }',
  },
];

export const buildPublicOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] =>
  workloadProfile === 'business-read'
    ? buildPublicReadOnlyOperationProfiles(workloadProfile)
    : buildPublicCrudOperationProfiles(workloadProfile);

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
  rowId?: string;
  config: PerfRunConfig;
  matrixCase: MatrixCase;
}): Promise<RequestOutcome> => {
  const { context, requestProfile, operation, sequence, rowId, config, matrixCase } = input;
  const started = performance.now();
  try {
    const variables = operation.buildVariables
      ? operation.buildVariables({ sequence, rowId, requestProfile, config, matrixCase })
      : operation.variables;
    const query = operation.buildQuery
      ? operation.buildQuery({ sequence, rowId, requestProfile, config, matrixCase })
      : operation.query;
    const response = await executeGraphql(context, {
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
      rowId: ok && operation.extractRowId
        ? operation.extractRowId({ responseBody: response.body, sequence, rowId, requestProfile, config, matrixCase })
        : undefined,
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
