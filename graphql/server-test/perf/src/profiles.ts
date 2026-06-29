import {
  buildPrivateOperationProfiles,
  buildPublicOperationProfiles,
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

const basePrivateProfiles = (): RequestProfile[] => [
  {
    id: 'private-services',
    routingMode: 'private',
    routeKey: 'schemata:services_public,metaschema_public',
    headers: privateServicesHeaders(),
    description: 'Constructive-local services/metaschema route selected by X-Schemata.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
  },
  {
    id: 'private-modules',
    routingMode: 'private',
    routeKey: 'schemata:metaschema_modules_public',
    headers: privateModulesHeaders(),
    description: 'Constructive-local DBPM modules route selected by X-Schemata.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
  },
  {
    id: 'private-meta',
    routingMode: 'private',
    routeKey: 'metaschema:constructive-local',
    headers: metaHeaders(),
    description: 'Private metadata route selected by X-Meta-Schema.',
    benchmarkOwned: false,
    metadata: { source: 'constructive-local' },
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
  requestProfiles: provision.requestProfiles,
  operationProfiles: buildPublicOperationProfiles(matrixCase.workloadProfile),
});
