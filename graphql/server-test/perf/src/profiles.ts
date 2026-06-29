import {
  buildPrivateOperationProfiles,
  buildPublicOperationProfiles,
  metaHeaders,
  privateApiHeaders,
  privateSchemataHeaders,
  publicHostHeaders,
  PUBLIC_HOST,
} from './operations';
import type {
  DbpmProvisionResult,
  MatrixCase,
  PerfRunConfig,
  RequestProfile,
  RuntimeOperationProfile,
} from './types';

const basePrivateProfiles = (): RequestProfile[] => [
  {
    id: 'private-api',
    routingMode: 'private',
    routeKey: 'api:simple-pets:private',
    headers: privateApiHeaders(),
    description: 'Private services API route selected by X-Api-Name.',
    benchmarkOwned: false,
    metadata: { source: 'simple-seed-services' },
  },
  {
    id: 'private-schemata',
    routingMode: 'private',
    routeKey: 'schemata:simple-pets-public,simple-pets-pets-public',
    headers: privateSchemataHeaders(),
    description: 'Private direct schema route selected by X-Schemata.',
    benchmarkOwned: false,
    metadata: { source: 'simple-seed-services' },
  },
  {
    id: 'private-meta',
    routingMode: 'private',
    routeKey: 'metaschema:simple-pets',
    headers: metaHeaders(),
    description: 'Private metadata route selected by X-Meta-Schema.',
    benchmarkOwned: false,
    metadata: { source: 'simple-seed-services' },
  },
];

export const buildPrivateProfiles = (
  matrixCase: MatrixCase,
  config: PerfRunConfig
): { requestProfiles: RequestProfile[]; operationProfiles: RuntimeOperationProfile[] } => {
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

  const operations = buildPrivateOperationProfiles(matrixCase.workloadProfile).flatMap((operation) => {
    if (!operation.compatibleRequestProfileIds) return [operation];
    const expandedIds = requestProfiles
      .filter((profile) => {
        const baseId = String(profile.metadata.baseProfileId || profile.id);
        return operation.compatibleRequestProfileIds!.includes(baseId);
      })
      .map((profile) => profile.id);
    return [{ ...operation, compatibleRequestProfileIds: expandedIds }];
  });

  return { requestProfiles, operationProfiles: operations };
};

export const buildPublicProfilesFromProvision = (
  provision: Pick<DbpmProvisionResult, 'requestProfiles'>,
  matrixCase: MatrixCase
): { requestProfiles: RequestProfile[]; operationProfiles: RuntimeOperationProfile[] } => ({
  requestProfiles: provision.requestProfiles.length
    ? provision.requestProfiles
    : [
        {
          id: 'public-app',
          routingMode: 'public',
          routeKey: PUBLIC_HOST,
          headers: publicHostHeaders(),
          description: 'Public app host route from simple-seed-services.',
          benchmarkOwned: false,
          metadata: { host: PUBLIC_HOST, source: 'simple-seed-services' },
        },
      ],
  operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
});
