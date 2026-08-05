import {
  BUILD_STATE_RELEASED_ERROR_CODE,
  defaultPreset,
  getBuilder,
  isBuildStateReleased,
  releaseBuildState
} from 'graphile-build';
import {
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  graphqlSync,
  printSchema
} from 'graphql';

type CapturedBuild = GraphileBuild.BuildBase & Partial<GraphileBuild.Build>;

interface Capture {
  builds: CapturedBuild[];
  owned: Map<string, string>[];
  disposalOrder: string[];
}

const makeCapturePlugin = (
  capture: Capture,
  configure?: (build: CapturedBuild) => void
): GraphileConfig.Plugin => ({
  name: 'BuildStateRetirementContractPlugin',
  version: '0.0.0',
  schema: {
    hooks: {
      build(build) {
        const owned = new Map([['construction-only', 'retained']]);
        capture.builds.push(build);
        capture.owned.push(owned);
        build.registerBuildStateDisposer(() => {
          capture.disposalOrder.push('owned');
          owned.clear();
        });
        configure?.(build);
        return build;
      }
    }
  }
});

const makeCapture = (): Capture => ({
  builds: [],
  owned: [],
  disposalOrder: []
});

const buildTestSchema = (
  capture: Capture,
  releaseBuildStateAfterValidation: boolean,
  extraPlugins: GraphileConfig.Plugin[] = []
): ReturnType<ReturnType<typeof getBuilder>['buildSchema']> => getBuilder({
  extends: [defaultPreset],
  plugins: [makeCapturePlugin(capture), ...extraPlugins],
  schema: { releaseBuildStateAfterValidation }
}).buildSchema(Object.create(null));

const expectReleasedError = (callback: () => unknown): void => {
  try {
    callback();
    throw new Error('Expected released build state to reject late access');
  } catch (error) {
    expect((error as Error & { code?: string }).code).toBe(
      BUILD_STATE_RELEASED_ERROR_CODE
    );
  }
};

describe('Graphile build-state retirement contract', () => {
  it('is default-off and retains plugin-owned construction state', () => {
    const capture = makeCapture();
    const schema = buildTestSchema(capture, false);

    expect(capture.disposalOrder).toEqual([]);
    expect(capture.owned[0].size).toBe(1);
    expect(isBuildStateReleased(capture.builds[0] as GraphileBuild.Build)).toBe(false);
    expect(capture.builds[0].getAllTypes()).toBeDefined();
    expect(graphqlSync({ schema, source: '{ __typename }' })).toEqual({
      data: { __typename: 'Query' }
    });
  });

  it('preserves schema bytes and execution while failing closed on late access', () => {
    const baselineCapture = makeCapture();
    const candidateCapture = makeCapture();
    const baseline = buildTestSchema(baselineCapture, false);
    const candidate = buildTestSchema(candidateCapture, true);
    const releasedBuild = candidateCapture.builds[0];

    expect(printSchema(candidate)).toBe(printSchema(baseline));
    expect(candidateCapture.disposalOrder).toEqual(['owned']);
    expect(candidateCapture.owned[0].size).toBe(0);
    expect(isBuildStateReleased(releasedBuild as GraphileBuild.Build)).toBe(true);
    expect(graphqlSync({ schema: candidate, source: '{ __typename }' })).toEqual({
      data: { __typename: 'Query' }
    });
    expectReleasedError(() => releasedBuild.input);
    expectReleasedError(() => releasedBuild.scopeByType);
    expectReleasedError(() => releasedBuild.getAllTypes());
    expectReleasedError(() => releasedBuild.behavior!.getDefaultBehaviorFor('string'));
    expect(releaseBuildState(releasedBuild as GraphileBuild.Build)).toBe(false);
  });

  it('runs every disposer in LIFO order and aggregates disposal failures', () => {
    const capture = makeCapture();
    const plugin = makeCapturePlugin(capture, (build) => {
      build.registerBuildStateDisposer(() => capture.disposalOrder.push('first'));
      build.registerBuildStateDisposer(() => {
        capture.disposalOrder.push('second-error');
        throw new Error('synthetic disposal failure');
      });
      build.registerBuildStateDisposer(() => capture.disposalOrder.push('third'));
    });
    const builder = getBuilder({
      extends: [defaultPreset],
      plugins: [plugin],
      schema: { releaseBuildStateAfterValidation: true }
    });

    let thrown: unknown;
    try {
      builder.buildSchema(Object.create(null));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toHaveLength(1);
    expect((thrown as AggregateError).errors[0]).toEqual(
      new Error('synthetic disposal failure')
    );
    expect(capture.disposalOrder).toEqual([
      'third',
      'second-error',
      'first',
      'owned'
    ]);
    expect(capture.owned[0].size).toBe(0);
    expect(isBuildStateReleased(capture.builds[0] as GraphileBuild.Build)).toBe(true);
  });

  it('keeps diagnostic state when schema validation fails', () => {
    const capture = makeCapture();
    const invalidSchemaPlugin: GraphileConfig.Plugin = {
      name: 'InvalidSchemaForRetirementContractPlugin',
      version: '0.0.0',
      schema: {
        hooks: {
          finalize(schema) {
            const requiredInterface = new GraphQLInterfaceType({
              name: 'RetirementRequiredInterface',
              fields: { required: { type: GraphQLString } }
            });
            const brokenObject = new GraphQLObjectType({
              name: 'RetirementBrokenObject',
              interfaces: [requiredInterface],
              fields: { other: { type: GraphQLString } }
            });
            const config = schema.toConfig();
            return new GraphQLSchema({
              ...config,
              types: [...config.types, requiredInterface, brokenObject]
            });
          }
        }
      }
    };

    expect(() => buildTestSchema(capture, true, [invalidSchemaPlugin]))
      .toThrow(/validation failure/i);
    expect(capture.disposalOrder).toEqual([]);
    expect(capture.owned[0].size).toBe(1);
    expect(isBuildStateReleased(capture.builds[0] as GraphileBuild.Build)).toBe(false);
    expect(capture.builds[0].getAllTypes()).toBeDefined();
  });

  it('retires each rebuild without clearing the builder hook registry', () => {
    const capture = makeCapture();
    const builder = getBuilder({
      extends: [defaultPreset],
      plugins: [makeCapturePlugin(capture)],
      schema: { releaseBuildStateAfterValidation: true }
    });

    const first = builder.buildSchema(Object.create(null));
    const second = builder.buildSchema(Object.create(null));

    expect(capture.builds).toHaveLength(2);
    expect(capture.owned).toHaveLength(2);
    expect(capture.owned.every((owned) => owned.size === 0)).toBe(true);
    expect(capture.builds.every((build) =>
      isBuildStateReleased(build as GraphileBuild.Build)
    )).toBe(true);
    expect(capture.disposalOrder).toEqual(['owned', 'owned']);
    expect(printSchema(second)).toBe(printSchema(first));
  });
});
