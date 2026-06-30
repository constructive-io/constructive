import { toRedactedErrorSample } from './artifacts';
import {
  executeGraphql,
  privateModulesHeaders,
  privateServicesHeaders,
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

interface DbpmNode {
  id: string;
  databaseName: string;
  ownerId: string;
  subdomain: string;
  domain: string;
  status: string;
  errorMessage?: string | null;
  databaseId?: string | null;
  completedAt?: string | null;
}

interface ApiNode {
  id: string;
  databaseId: string;
  name: string;
  isPublic: boolean;
}

interface DomainNode {
  id: string;
  databaseId: string;
  apiId?: string | null;
  subdomain?: string | null;
  domain?: string | null;
}

interface SchemaNode {
  id: string;
  databaseId: string;
  name: string;
  schemaName: string;
  isPublic: boolean;
}

interface ServicesSnapshot {
  apis?: { nodes: ApiNode[] };
  domains?: { nodes: DomainNode[] };
  schemas?: { nodes: SchemaNode[] };
}

const SUDO_USER_ID = '00000000-0000-0000-0000-000000000002';
const DBPM_MODULES = ['users_module'];

const createDatabaseProvisionModuleMutation = `mutation PerfCreateDbpm($input: CreateDatabaseProvisionModuleInput!) {
  createDatabaseProvisionModule(input: $input) {
    databaseProvisionModule {
      id
      databaseName
      ownerId
      subdomain
      domain
      status
      errorMessage
      databaseId
      completedAt
    }
  }
}`;

const servicesSnapshotQuery = `query PerfServicesSnapshot($first: Int!) {
  apis(first: $first) { nodes { id databaseId name isPublic } }
  domains(first: $first) { nodes { id databaseId apiId subdomain domain } }
  schemas(first: $first) { nodes { id databaseId name schemaName isPublic } }
}`;

const provisionTableMutation = `mutation PerfProvisionTable($input: ProvisionTableInput!) {
  provisionTable(input: $input) {
    result { outTableId outFields }
  }
}`;

const publicSchemaIntrospectionQuery = `fragment PerfPublicTypeRef on __Type {
  kind
  name
  ofType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
      }
    }
  }
}

query PerfPublicSchemaShape {
  __schema {
    queryType { fields { name } }
    mutationType {
      fields {
        name
        args { name type { ...PerfPublicTypeRef } }
        type {
          kind
          name
          fields { name }
          ofType {
            kind
            name
            fields { name }
            ofType {
              kind
              name
              fields { name }
            }
          }
        }
      }
    }
  }
}`;

const toHost = (domain: DomainNode): string | null => {
  if (!domain.domain) return null;
  return domain.subdomain ? `${domain.subdomain}.${domain.domain}` : domain.domain;
};

const safeLower = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const safeDbName = (value: string): string =>
  value
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const trimToken = (value: string, maxLength: number): string =>
  value.slice(0, maxLength).replace(/[-_]+$/g, '');

const uniqueBase = (config: PerfRunConfig, matrixCase: MatrixCase, index: number): string =>
  trimToken(safeLower(`${config.benchmarkOwnedPrefix}-${index + 1}-${matrixCase.caseId}`), 48);

const tableStem = (base: string): string => trimToken(safeDbName(`perf_items_${base}`), 60);

const namedTypeName = (typeRef: any): string | undefined =>
  typeRef?.name || (typeRef?.ofType ? namedTypeName(typeRef.ofType) : undefined);

const fieldsForType = (typeRef: any): string[] => {
  if (!typeRef) return [];
  if (Array.isArray(typeRef.fields)) return typeRef.fields.map((field: any) => field.name).filter(Boolean);
  return fieldsForType(typeRef.ofType);
};

const nodeFieldFromListField = (listField?: string): string | undefined => {
  if (!listField) return undefined;
  return listField.endsWith('s') && listField.length > 1 ? listField.slice(0, -1) : listField;
};

const queryServicesSnapshot = async (
  context: BenchmarkContext
): Promise<{ snapshot?: ServicesSnapshot; errors: RedactedErrorSample[] }> => {
  const response = await executeGraphql<ServicesSnapshot>(context, {
    query: servicesSnapshotQuery,
    variables: { first: 1000 },
    headers: privateServicesHeaders(),
    surface: 'private',
  });

  if (responseHasUnexpectedErrors(response)) {
    return { errors: [responseErrorSample(response, { operation: 'dbpm.snapshot.private' })] };
  }

  return { snapshot: response.body.data, errors: [] };
};

const apiHostFor = (snapshot: ServicesSnapshot, databaseId: string): { host?: string; api?: ApiNode; domain?: DomainNode } => {
  const apis = snapshot.apis?.nodes || [];
  const domains = snapshot.domains?.nodes || [];
  const api = apis.find((candidate) => candidate.databaseId === databaseId && candidate.name === 'api' && candidate.isPublic);
  const domain = domains.find((candidate) => candidate.databaseId === databaseId && candidate.apiId === api?.id);
  return { api, domain, host: domain ? toHost(domain) || undefined : undefined };
};

const appPublicSchemaFor = (snapshot: ServicesSnapshot, databaseId: string): SchemaNode | undefined =>
  (snapshot.schemas?.nodes || []).find((schema) => databaseId === schema.databaseId && schema.name === 'app_public');

const introspectPublicTableShape = async (input: {
  context: BenchmarkContext;
  host: string;
  tableName: string;
}): Promise<{
  listField?: string;
  createField?: string;
  updateField?: string;
  createInputType?: string;
  updateInputType?: string;
  nodeField?: string;
  patchField?: string;
  errors: RedactedErrorSample[];
}> => {
  const { context, host, tableName } = input;
  const response = await executeGraphql<{
    __schema?: {
      queryType?: { fields?: Array<{ name: string }> };
      mutationType?: {
        fields?: Array<{
          name: string;
          args?: Array<{ name: string; type?: unknown }>;
          type?: unknown;
        }>;
      };
    };
  }>(context, {
    query: publicSchemaIntrospectionQuery,
    headers: publicHostHeaders(host),
  });

  if (responseHasUnexpectedErrors(response)) {
    return { errors: [responseErrorSample(response, { operation: 'dbpm.public.introspect' })] };
  }

  const normalizedTable = tableName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const queryFields = response.body.data?.__schema?.queryType?.fields?.map((field) => field.name) || [];
  const mutationFields = response.body.data?.__schema?.mutationType?.fields || [];
  const includesTable = (fieldName: string) =>
    fieldName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(normalizedTable);
  const listField = queryFields.find((fieldName) => includesTable(fieldName));
  const createMutation = mutationFields.find((field) => field.name.startsWith('create') && includesTable(field.name));
  const updateMutation = mutationFields.find((field) => field.name.startsWith('update') && includesTable(field.name));
  const payloadFields = fieldsForType(createMutation?.type).length > 0
    ? fieldsForType(createMutation?.type)
    : fieldsForType(updateMutation?.type);
  const nodeField =
    payloadFields.find((fieldName) => includesTable(fieldName)) ||
    nodeFieldFromListField(listField);
  const inputTypeFor = (field?: { args?: Array<{ name: string; type?: unknown }> }): string | undefined =>
    namedTypeName(field?.args?.find((arg) => arg.name === 'input')?.type);

  return {
    listField,
    createField: createMutation?.name,
    updateField: updateMutation?.name,
    createInputType: inputTypeFor(createMutation),
    updateInputType: inputTypeFor(updateMutation),
    nodeField,
    patchField: nodeField ? `${nodeField}Patch` : undefined,
    errors: [],
  };
};

const provisionOneTenant = async (input: {
  context: BenchmarkContext;
  config: PerfRunConfig;
  matrixCase: MatrixCase;
  index: number;
}): Promise<{
  requestProfile?: RequestProfile;
  objectIds: string[];
  businessTableCreated: boolean;
  errors: RedactedErrorSample[];
  warnings: string[];
}> => {
  const { context, config, matrixCase, index } = input;
  const errors: RedactedErrorSample[] = [];
  const warnings: string[] = [];
  const objectIds: string[] = [];
  const base = uniqueBase(config, matrixCase, index);
  const subdomain = trimToken(`perf-${base}`, 60);
  const databaseName = trimToken(safeDbName(`perf_dbpm_${base}`), 60);
  const tableName = tableStem(base);

  const createDbpm = await executeGraphql<{ createDatabaseProvisionModule?: { databaseProvisionModule?: DbpmNode } }>(
    context,
    {
      query: createDatabaseProvisionModuleMutation,
      variables: {
        input: {
          databaseProvisionModule: {
            databaseName,
            ownerId: SUDO_USER_ID,
            subdomain,
            domain: 'localhost',
            modules: DBPM_MODULES,
            options: {},
            bootstrapUser: false,
          },
        },
      },
      headers: privateModulesHeaders(),
      surface: 'private',
    }
  );

  const provision = createDbpm.body.data?.createDatabaseProvisionModule?.databaseProvisionModule;
  if (responseHasUnexpectedErrors(createDbpm) || !provision?.databaseId || provision.status !== 'completed') {
    errors.push(responseErrorSample(createDbpm, { operation: 'dbpm.createDatabaseProvisionModule' }));
    if (provision?.errorMessage) {
      errors.push(
        toRedactedErrorSample(provision.errorMessage, { operation: 'dbpm.createDatabaseProvisionModule.errorMessage' }) as RedactedErrorSample
      );
    }
    return { objectIds, businessTableCreated: false, errors, warnings };
  }

  objectIds.push(provision.id, provision.databaseId);

  const snapshotResult = await queryServicesSnapshot(context);
  errors.push(...snapshotResult.errors);
  const snapshot = snapshotResult.snapshot;
  if (!snapshot) {
    return { objectIds, businessTableCreated: false, errors, warnings };
  }

  const appSchema = appPublicSchemaFor(snapshot, provision.databaseId);
  const route = apiHostFor(snapshot, provision.databaseId);
  if (!appSchema?.id) {
    errors.push(toRedactedErrorSample('DBPM provision did not expose an app_public schema.', {
      operation: 'dbpm.findAppPublicSchema',
    }) as RedactedErrorSample);
  }
  if (!route.host || !route.api?.id || !route.domain?.id) {
    errors.push(toRedactedErrorSample('DBPM provision did not expose an api public host.', {
      operation: 'dbpm.findApiHost',
    }) as RedactedErrorSample);
  }
  if (!appSchema?.id || !route.host || !route.api || !route.domain) {
    return { objectIds, businessTableCreated: false, errors, warnings };
  }

  const table = await executeGraphql<{ provisionTable?: { result?: Array<{ outTableId?: string; outFields?: string[] }> } }>(
    context,
    {
      query: provisionTableMutation,
      variables: {
        input: {
          databaseId: provision.databaseId,
          schemaId: appSchema.id,
          tableName,
          nodes: [{ $type: 'DataId' }],
          fields: [{ name: 'label', type: { name: 'text' } }],
          useRls: false,
          grants: [
            {
              roles: ['anonymous', 'authenticated'],
              privileges: [['select', '*'], ['insert', '*'], ['update', '*'], ['delete', '*']],
            },
          ],
        },
      },
      headers: privateModulesHeaders(),
      surface: 'private',
    }
  );

  const tableResult = table.body.data?.provisionTable?.result?.[0];
  if (responseHasUnexpectedErrors(table) || !tableResult?.outTableId) {
    errors.push(responseErrorSample(table, { operation: 'dbpm.provisionTable' }));
    return { objectIds, businessTableCreated: false, errors, warnings };
  }

  objectIds.push(tableResult.outTableId, ...(tableResult.outFields || []));

  const publicShape = await introspectPublicTableShape({ context, host: route.host, tableName });
  errors.push(...publicShape.errors);
  if (!publicShape.listField) {
    errors.push(toRedactedErrorSample(`Public API host ${route.host} did not expose benchmark table ${tableName}.`, {
      operation: 'dbpm.public.tableShape',
    }) as RedactedErrorSample);
    return { objectIds, businessTableCreated: true, errors, warnings };
  }
  if (
    !publicShape.createField ||
    !publicShape.updateField ||
    !publicShape.createInputType ||
    !publicShape.updateInputType ||
    !publicShape.nodeField ||
    !publicShape.patchField
  ) {
    warnings.push(`Public API host ${route.host} exposes list field ${publicShape.listField} but not full CRUD mutations.`);
  }

  return {
    objectIds,
    businessTableCreated: true,
    errors,
    warnings,
    requestProfile: {
      id: `public-dbpm-${index + 1}`,
      routingMode: 'public',
      routeKey: route.host,
      headers: publicHostHeaders(route.host),
      description: 'Benchmark-owned public DBPM host route provisioned through constructive-local private GraphQL.',
      benchmarkOwned: true,
      metadata: {
        source: 'constructive-local-dbpm-graphql',
        host: route.host,
        apiId: route.api.id,
        domainId: route.domain.id,
        databaseId: provision.databaseId,
        schemaId: appSchema.id,
        schemaName: appSchema.schemaName,
        tableName,
        tableId: tableResult.outTableId,
        outFieldIds: tableResult.outFields || [],
        listField: publicShape.listField,
        createField: publicShape.createField,
        updateField: publicShape.updateField,
        createInputType: publicShape.createInputType,
        updateInputType: publicShape.updateInputType,
        nodeField: publicShape.nodeField,
        patchField: publicShape.patchField,
      },
    },
  };
};

export const provisionDbpmPublic = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
}): Promise<DbpmProvisionResult> => {
  const { context, matrixCase, config } = input;
  const errors: RedactedErrorSample[] = [];
  const warnings: string[] = [];
  const requestProfiles: RequestProfile[] = [];
  const objectIds: string[] = [];
  let businessTableCount = 0;

  if (!context.privateRequest) {
    const error = toRedactedErrorSample('Private admin GraphQL server is unavailable for DBPM provision.', {
      operation: 'dbpm.privateAdmin',
    }) as RedactedErrorSample;
    return {
      ok: false,
      completed: false,
      source: 'unavailable',
      tenantCount: 0,
      publicHostCount: 0,
      apiCount: 0,
      businessTableCount: 0,
      requestProfiles,
      operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
      benchmarkOwnedObjectIds: [],
      errors: [error],
      warnings,
    };
  }

  for (let index = 0; index < matrixCase.scaleProfile.k; index += 1) {
    const provisioned = await provisionOneTenant({ context, config, matrixCase, index });
    objectIds.push(...provisioned.objectIds);
    errors.push(...provisioned.errors);
    warnings.push(...provisioned.warnings);
    if (provisioned.businessTableCreated) businessTableCount += 1;
    if (provisioned.requestProfile) requestProfiles.push(provisioned.requestProfile);
  }

  if (requestProfiles.length < matrixCase.scaleProfile.k) {
    warnings.push(`Requested k=${matrixCase.scaleProfile.k} public profiles but provisioned ${requestProfiles.length}.`);
  }

  return {
    ok: errors.length === 0 && requestProfiles.length >= matrixCase.scaleProfile.k,
    completed: errors.length === 0 && requestProfiles.length >= matrixCase.scaleProfile.k,
    source: requestProfiles.length > 0 ? 'graphql' : 'unavailable',
    tenantCount: new Set(requestProfiles.map((profile) => String(profile.metadata.databaseId))).size,
    publicHostCount: requestProfiles.length,
    apiCount: requestProfiles.length,
    businessTableCount,
    requestProfiles,
    operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
    benchmarkOwnedObjectIds: objectIds,
    errors,
    warnings,
  };
};
