import {
  buildPrivateOperationProfiles,
  buildPublicOperationProfiles,
  DEFAULT_DATABASE_ID,
  META_SCHEMAS,
  MODULES_SCHEMATA,
  SERVICES_SCHEMATA,
  metaHeaders,
  privateModulesHeaders,
  privateServicesHeaders,
} from './operations';
import type {
  DbpmProvisionResult,
  MatrixCase,
  PerfRunConfig,
  RequestProfile,
  RuntimeOperationProfile,
} from './types';

const privateSchemataHeaders = (databaseId: string, schemata: string): Record<string, string> => ({
  'X-Database-Id': databaseId,
  'X-Schemata': schemata,
});

const basePrivateProfiles = (): RequestProfile[] => [
  {
    id: 'private-services',
    routingMode: 'private',
    routeKey: `schemata:${DEFAULT_DATABASE_ID}:${SERVICES_SCHEMATA}`,
    headers: privateServicesHeaders(),
    description: 'Constructive-local services/metaschema route selected by X-Schemata.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
  },
  {
    id: 'private-modules',
    routingMode: 'private',
    routeKey: `schemata:${DEFAULT_DATABASE_ID}:${MODULES_SCHEMATA}`,
    headers: privateModulesHeaders(),
    description: 'Constructive-local DBPM modules route selected by X-Schemata.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
  },
  {
    id: 'private-meta',
    routingMode: 'private',
    routeKey: `metaschema:api:${DEFAULT_DATABASE_ID}`,
    headers: metaHeaders(),
    description: 'Private metadata route selected by X-Meta-Schema.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
  },
];

const syntheticDatabaseId = (config: PerfRunConfig, index: number): string =>
  `${config.benchmarkOwnedPrefix}-db-${String(index + 1).padStart(4, '0')}`;

const schemaCombinations = (): string[] => {
  const sets: string[] = [];
  for (let mask = 1; mask < (1 << META_SCHEMAS.length); mask += 1) {
    const schemas = META_SCHEMAS.filter((_, index) => (mask & (1 << index)) !== 0);
    sets.push(schemas.join(','));
  }
  return sets;
};

const buildSharedBuildKeyProfiles = (matrixCase: MatrixCase, config: PerfRunConfig): RequestProfile[] => {
  const target = Math.max(1, matrixCase.scaleProfile.k);
  return Array.from({ length: target }, (_, index) => {
    const databaseId = syntheticDatabaseId(config, index);
    return {
      id: `private-cache-shared-${index + 1}`,
      routingMode: 'private',
      routeKey: `schemata:${databaseId}:${SERVICES_SCHEMATA}`,
      headers: privateSchemataHeaders(databaseId, SERVICES_SCHEMATA),
      description: 'Private route with a distinct svc_key and shared Graphile build inputs.',
      benchmarkOwned: true,
      metadata: {
        source: 'constructive-local-synthetic',
        cacheKeyMode: 'shared-build-key',
        databaseId,
        schemata: SERVICES_SCHEMATA,
        expectedBuildKeyGroup: SERVICES_SCHEMATA,
      },
    };
  });
};

const buildDistinctBuildKeyProfiles = (matrixCase: MatrixCase, config: PerfRunConfig): RequestProfile[] => {
  const target = Math.max(1, matrixCase.scaleProfile.k);
  const schemaSets = schemaCombinations();
  return Array.from({ length: target }, (_, index) => {
    const databaseId = syntheticDatabaseId(config, index);
    const schemata = schemaSets[index % schemaSets.length];
    return {
      id: `private-cache-distinct-${index + 1}`,
      routingMode: 'private',
      routeKey: `schemata:${databaseId}:${schemata}`,
      headers: privateSchemataHeaders(databaseId, schemata),
      description: 'Private route with distinct svc_key and distinct Graphile build inputs.',
      benchmarkOwned: true,
      metadata: {
        source: 'constructive-local-synthetic',
        cacheKeyMode: 'distinct-build-key',
        databaseId,
        schemata,
        expectedBuildKeyGroup: schemata,
        repeatedBuildKey: index >= schemaSets.length,
      },
    };
  });
};

const buildMetadataReadProfiles = (
  matrixCase: MatrixCase,
  config: PerfRunConfig
): RequestProfile[] => {
  const bases = basePrivateProfiles();
  const requestProfiles: RequestProfile[] = [];
  const target = Math.max(1, matrixCase.scaleProfile.k);
  for (let i = 0; i < target; i += 1) {
    const base = bases[i % bases.length];
    requestProfiles.push(
      i < bases.length
        ? base
        : {
            ...base,
            id: `${base.id}-${i + 1}`,
            routeKey: `${base.routeKey}#profile-${i + 1}`,
            headers: { ...base.headers, 'X-Perf-Profile': `${config.benchmarkOwnedPrefix}-${i + 1}` },
            metadata: { ...base.metadata, repeatedRoute: true, baseProfileId: base.id },
          }
    );
  }
  return requestProfiles;
};

export const buildPrivateProfiles = (
  matrixCase: MatrixCase,
  config: PerfRunConfig
): { requestProfiles: RequestProfile[]; operationProfiles: RuntimeOperationProfile[] } => {
  const requestProfiles = matrixCase.workloadProfile === 'cache-key-shared'
    ? buildSharedBuildKeyProfiles(matrixCase, config)
    : matrixCase.workloadProfile === 'cache-key-distinct'
      ? buildDistinctBuildKeyProfiles(matrixCase, config)
      : buildMetadataReadProfiles(matrixCase, config);

  const operations = buildPrivateOperationProfiles(matrixCase.workloadProfile).map((operation) => {
    if (!operation.compatibleRequestProfileIds) return operation;
    const expandedIds = requestProfiles
      .filter((profile) => {
        const baseId = String(profile.metadata.baseProfileId || profile.id);
        return operation.compatibleRequestProfileIds!.includes(baseId);
      })
      .map((profile) => profile.id);
    return { ...operation, compatibleRequestProfileIds: expandedIds };
  });

  return { requestProfiles, operationProfiles: operations };
};

export const buildPublicProfilesFromProvision = (
  provision: Pick<DbpmProvisionResult, 'requestProfiles'>,
  matrixCase: MatrixCase
): { requestProfiles: RequestProfile[]; operationProfiles: RuntimeOperationProfile[] } => ({
  requestProfiles: provision.requestProfiles,
  operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
});
