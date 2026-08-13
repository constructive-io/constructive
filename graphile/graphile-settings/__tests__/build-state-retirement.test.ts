import {
  buildSchema,
  defaultPreset,
  QueryPlugin,
  QueryQueryPlugin,
} from 'graphile-build';
import { resolvePreset } from 'graphile-config';
import { GraphQLSchema, graphqlSync } from 'graphql';

import { BuildStateRetirementPlugin } from '../src/plugins/build-state-retirement';
import { ConstructivePreset } from '../src/presets/constructive-preset';

declare global {
  namespace GraphileConfig {
    interface Plugins {
      BuildStateRetirementTestOwnerPlugin: true;
      BuildStateRetirementInvalidSchemaPlugin: true;
    }
  }
}

function makeOwnerPlugin(
  owned: string[],
  capture: (build: GraphileBuild.BuildBase) => void
): GraphileConfig.Plugin {
  return {
    name: 'BuildStateRetirementTestOwnerPlugin',
    schema: {
      hooks: {
        build(build) {
          capture(build);
          build.registerBuildStateDisposer(() => owned.push('first'));
          build.registerBuildStateDisposer(() => owned.push('second'));
          return build;
        },
      },
    },
  };
}

describe('Constructive build-state retirement', () => {
  it('opts Constructive in without changing the Graphile default preset', () => {
    expect(resolvePreset(ConstructivePreset).plugins).toContain(
      BuildStateRetirementPlugin
    );
    expect(resolvePreset(defaultPreset).plugins).not.toContain(
      BuildStateRetirementPlugin
    );
  });

  it('retains build state when the CNC plugin is not installed', () => {
    const disposed: string[] = [];
    let capturedBuild: GraphileBuild.BuildBase | undefined;

    buildSchema(
      {
        plugins: [
          QueryPlugin,
          QueryQueryPlugin,
          makeOwnerPlugin(disposed, (build) => {
            capturedBuild = build;
          }),
        ],
      },
      Object.create(null)
    );

    expect(disposed).toEqual([]);
    expect(capturedBuild!.input).toEqual(Object.create(null));
  });

  it('retires after validation, in reverse disposer order, and preserves execution', () => {
    const disposed: string[] = [];
    let capturedBuild: GraphileBuild.BuildBase | undefined;
    const schema = buildSchema(
      {
        plugins: [
          QueryPlugin,
          QueryQueryPlugin,
          makeOwnerPlugin(disposed, (build) => {
            capturedBuild = build;
          }),
          BuildStateRetirementPlugin,
        ],
      },
      Object.create(null)
    );

    expect(disposed).toEqual(['second', 'first']);
    expect(() => capturedBuild!.input).toThrow(
      expect.objectContaining({ code: 'GRAPHILE_BUILD_STATE_RELEASED' })
    );
    expect(graphqlSync({ schema, source: '{ __typename }' })).toEqual({
      data: { __typename: 'Query' },
    });
  });

  it('does not retire when schema validation fails', () => {
    const disposed: string[] = [];
    let capturedBuild: GraphileBuild.BuildBase | undefined;
    const InvalidSchemaPlugin: GraphileConfig.Plugin = {
      name: 'BuildStateRetirementInvalidSchemaPlugin',
      schema: {
        hooks: {
          finalize() {
            return new GraphQLSchema({});
          },
        },
      },
    };

    expect(() =>
      buildSchema(
        {
          plugins: [
            QueryPlugin,
            QueryQueryPlugin,
            makeOwnerPlugin(disposed, (build) => {
              capturedBuild = build;
            }),
            BuildStateRetirementPlugin,
            InvalidSchemaPlugin,
          ],
        },
        Object.create(null)
      )
    ).toThrow(/validation failure/);
    expect(disposed).toEqual([]);
    expect(capturedBuild!.input).toEqual(Object.create(null));
  });

  it('attempts every disposer and aggregates failures before failing closed', () => {
    const calls: string[] = [];
    let capturedBuild: GraphileBuild.BuildBase | undefined;
    const FailingOwnerPlugin: GraphileConfig.Plugin = {
      name: 'BuildStateRetirementTestOwnerPlugin',
      schema: {
        hooks: {
          build(build) {
            capturedBuild = build;
            build.registerBuildStateDisposer(() => {
              calls.push('first');
              throw new Error('first failed');
            });
            build.registerBuildStateDisposer(() => {
              calls.push('second');
              throw new Error('second failed');
            });
            return build;
          },
        },
      },
    };

    expect(() =>
      buildSchema(
        {
          plugins: [
            QueryPlugin,
            QueryQueryPlugin,
            FailingOwnerPlugin,
            BuildStateRetirementPlugin,
          ],
        },
        Object.create(null)
      )
    ).toThrow(
      expect.objectContaining({
        message: expect.stringContaining('2 disposal errors'),
        errors: [
          expect.objectContaining({ message: 'second failed' }),
          expect.objectContaining({ message: 'first failed' }),
        ],
      })
    );
    expect(calls).toEqual(['second', 'first']);
    expect(() => capturedBuild!.input).toThrow(
      expect.objectContaining({ code: 'GRAPHILE_BUILD_STATE_RELEASED' })
    );
  });
});
