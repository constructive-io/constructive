import type { Response } from 'supertest';

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

export const DEFAULT_DATABASE_ID = '80a2eaaf-f77e-4bfe-8506-df929ef1b8d9';
export const SIMPLE_PETS_SCHEMAS = ['simple-pets-public', 'simple-pets-pets-public'];
export const META_SCHEMAS = ['services_public', 'metaschema_public', 'metaschema_modules_public'];
export const PUBLIC_HOST = 'app.test.constructive.io';
export const PRIVATE_API_NAME = 'private';
export const PRIVATE_SCHEMATA = SIMPLE_PETS_SCHEMAS.join(',');
export const BENCHMARK_ANIMAL_ID = 'a0000001-0000-0000-0000-000000000001';

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
  }
): Promise<GraphqlHttpResult<T>> => {
  let req = context.conn.request
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

export const publicHostHeaders = (host = PUBLIC_HOST): Record<string, string> => ({ Host: host });

const metadataQuery = `query PerfMetadataRead {
  databases(first: 3) { nodes { id name } }
  schemas(first: 5) { nodes { id name schemaName isPublic } }
  apis(first: 5) { nodes { id name isPublic databaseId } }
}`;

const animalsListQuery = `query PerfAnimalsList($first: Int!) {
  animals(first: $first) { nodes { id name species } }
}`;

const createAnimalMutation = `mutation PerfCreateAnimal($input: CreateAnimalInput!) {
  createAnimal(input: $input) { animal { id name species } }
}`;

const updateAnimalMutation = `mutation PerfUpdateAnimal($input: UpdateAnimalInput!) {
  updateAnimal(input: $input) { animal { id name species } }
}`;

export const buildPrivateOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'private-animals-list',
    name: 'private.animals.list',
    weight: 5,
    workloadProfile,
    description: 'Read app animals through private service routing.',
    mutates: false,
    compatibleRequestProfileIds: ['private-api', 'private-schemata'],
    query: animalsListQuery,
    variables: { first: 5 },
  },
  {
    id: 'private-typename',
    name: 'private.typename',
    weight: 2,
    workloadProfile,
    description: 'Tiny private schema sanity query.',
    mutates: false,
    compatibleRequestProfileIds: ['private-api', 'private-schemata'],
    query: '{ __typename }',
  },
  {
    id: 'private-metadata-read',
    name: 'private.metadata.read',
    weight: 3,
    workloadProfile,
    description: 'Read metadata through X-Meta-Schema private route.',
    mutates: false,
    compatibleRequestProfileIds: ['private-meta'],
    query: metadataQuery,
  },
];

export const buildPublicOperationProfiles = (workloadProfile: string): RuntimeOperationProfile[] => [
  {
    id: 'public-animals-list',
    name: 'public.animals.list',
    weight: 8,
    workloadProfile,
    description: 'List business animals through public host routing.',
    mutates: false,
    query: animalsListQuery,
    variables: { first: 5 },
  },
  {
    id: 'public-animal-create',
    name: 'public.animals.create',
    weight: 1,
    workloadProfile,
    description: 'Create benchmark-owned business animal rows through GraphQL.',
    mutates: true,
    query: createAnimalMutation,
    buildVariables: ({ sequence, config, matrixCase, requestProfile }) => ({
      input: {
        animal: {
          name: `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}_${requestProfile.id}_${sequence}`.slice(0, 240),
          species: 'Perf',
        },
      },
    }),
  },
  {
    id: 'public-animal-update',
    name: 'public.animals.update',
    weight: 1,
    workloadProfile,
    description: 'Update a benchmark-owned business animal through GraphQL.',
    mutates: true,
    query: updateAnimalMutation,
    buildVariables: ({ sequence, config, matrixCase, requestProfile }) => ({
      input: {
        id: requestProfile.metadata.benchmarkAnimalId,
        animalPatch: {
          name: `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}_${requestProfile.id}_update_${sequence}`.slice(0, 240),
        },
      },
    }),
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
    response = await executeGraphql(context, {
      query: operation.query,
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
