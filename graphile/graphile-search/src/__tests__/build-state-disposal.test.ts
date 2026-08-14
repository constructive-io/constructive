import { createUnifiedSearchPlugin } from '../plugin';

function getBuildHook(plugin: GraphileConfig.Plugin): (build: any) => any {
  return plugin.schema!.hooks!.build as (build: any) => any;
}

describe('graphile-search build-state ownership', () => {
  it('clears the unified-search codec cache through the build lifecycle', () => {
    const detectColumns = jest.fn((): never[] => []);
    const plugin = createUnifiedSearchPlugin({
      adapters: [
        {
          name: 'test',
          detectColumns,
          registerTypes: jest.fn(),
          scoreSemantics: { metric: 'score', lowerIsBetter: false },
        } as never,
      ],
    });
    let dispose: (() => void) | undefined;
    const build = {
      registerBuildStateDisposer(callback: () => void) {
        dispose = callback;
      },
    };
    getBuildHook(plugin)(build);

    const inferred = (plugin.schema!.entityBehavior!.pgCodecAttribute as any)
      .inferred.callback;
    const codec = { name: 'document', attributes: { body: {} } };
    inferred([], [codec, 'body'], build);
    inferred([], [codec, 'body'], build);
    expect(detectColumns).toHaveBeenCalledTimes(1);

    dispose!();
    inferred([], [codec, 'body'], build);
    expect(detectColumns).toHaveBeenCalledTimes(2);
  });
});
