import { toRedactedErrorSample } from './artifacts';
import { executeGraphql } from './operations';
import type {
  BenchmarkContext,
  MatrixCase,
  PerfRunConfig,
  RedactedErrorSample,
  RequestProfile,
} from './types';

const createAnimalMutation = `mutation PerfSetupCreateAnimal($input: CreateAnimalInput!) {
  createAnimal(input: $input) { animal { id name species } }
}`;

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
  const { context, matrixCase, config } = input;
  const errors: RedactedErrorSample[] = [];
  const prepared: RequestProfile[] = [];

  for (const [index, profile] of input.requestProfiles.entries()) {
    const name = `${config.benchmarkOwnedPrefix}_${matrixCase.caseId}_${profile.id}_seed_${index}`.slice(0, 240);
    try {
      const response = await executeGraphql<{ createAnimal?: { animal?: { id?: string } } }>(context, {
        query: createAnimalMutation,
        variables: { input: { animal: { name, species: 'Perf' } } },
        headers: profile.headers,
      });
      const animalId = response.body?.data?.createAnimal?.animal?.id;
      if (response.status < 200 || response.status >= 300 || response.body?.errors?.length || !animalId) {
        errors.push(
          toRedactedErrorSample(response.body?.errors || response.text || 'GraphQL setup did not return animal id', {
            operation: 'setup.public.createBenchmarkAnimal',
            requestProfileId: profile.id,
            status: response.status,
          }) as RedactedErrorSample
        );
        prepared.push(profile);
      } else {
        prepared.push({
          ...profile,
          benchmarkOwned: profile.benchmarkOwned,
          metadata: {
            ...profile.metadata,
            benchmarkAnimalId: animalId,
            benchmarkAnimalName: name,
          },
        });
      }
    } catch (error) {
      errors.push(
        toRedactedErrorSample(error, {
          operation: 'setup.public.createBenchmarkAnimal',
          requestProfileId: profile.id,
        }) as RedactedErrorSample
      );
      prepared.push(profile);
    }
  }

  return {
    ok: errors.length === 0,
    requestProfiles: prepared,
    errors,
    touchedNonBenchmarkObjects: false,
  };
};
