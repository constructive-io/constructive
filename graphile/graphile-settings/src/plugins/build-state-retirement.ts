import type { GraphileConfig } from 'graphile-config';

const RETIRE_BUILD_STATE = Symbol.for(
  'constructive.graphile-build.retireBuildState'
);

type RetireBuildState = () => boolean;

function retireBuildState(build: GraphileBuild.BuildBase): boolean {
  const capability = (
    build as unknown as Record<symbol, RetireBuildState | undefined>
  )[RETIRE_BUILD_STATE];
  if (typeof capability !== 'function') {
    throw new Error(
      'Build-state retirement requires the Constructive graphile-build patch'
    );
  }
  return capability();
}

/**
 * Opts a schema build into Constructive's build-state retirement policy.
 *
 * The graphile-build patch owns the private state and cleanup implementation;
 * this CNC-owned plugin controls whether and when that implementation runs.
 */
export const BuildStateRetirementPlugin: GraphileConfig.Plugin = {
  name: 'BuildStateRetirementPlugin',
  version: '1.0.0',
  description: 'Retires construction-only state after schema validation',
  schema: {
    hooks: {
      build(build) {
        build.registerAfterSchemaValidation(() => retireBuildState(build));
        return build;
      },
    },
  },
};

declare global {
  namespace GraphileConfig {
    interface Plugins {
      BuildStateRetirementPlugin: true;
    }
  }
}
