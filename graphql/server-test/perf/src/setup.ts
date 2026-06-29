import { toRedactedErrorSample } from './artifacts';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  RedactedErrorSample,
  RequestProfile,
} from './types';

export interface BusinessSetupResult {
  ok: boolean;
  requestProfiles: RequestProfile[];
  errors: RedactedErrorSample[];
  touchedNonBenchmarkObjects: boolean;
}

export const preparePublicBusinessWorkload = async (input: {
  context: BenchmarkContext;
  matrixCase: MatrixCase;
  config: PerfRunConfig;
  requestProfiles: RequestProfile[];
}): Promise<BusinessSetupResult> => {
  void input.context;
  void input.matrixCase;
  void input.config;

  const errors = input.requestProfiles
    .filter((profile) => typeof profile.metadata.listField !== 'string' || !profile.metadata.listField)
    .map((profile) =>
      toRedactedErrorSample(`Public request profile ${profile.id} is missing benchmark table listField metadata.`, {
        operation: 'setup.public.validateBenchmarkTable',
        requestProfileId: profile.id,
      }) as RedactedErrorSample
    );

  return {
    ok: errors.length === 0,
    requestProfiles: input.requestProfiles,
    errors,
    touchedNonBenchmarkObjects: false,
  };
};
