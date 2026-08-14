import { ConnectionFilterCustomOperatorsPlugin } from '../src/plugins/ConnectionFilterCustomOperatorsPlugin';
import { $$filters } from '../src/types';

describe('connection-filter build-state ownership', () => {
  it('clears the custom operator registry through the build lifecycle', () => {
    let dispose: (() => void) | undefined;
    const build: any = {
      registerBuildStateDisposer(callback: () => void) {
        dispose = callback;
      },
    };
    const buildHook = ConnectionFilterCustomOperatorsPlugin.schema!.hooks!
      .build as (build: any) => any;
    buildHook(build);

    const operators = new Map([['equalTo', { resolve: jest.fn() }]]);
    build[$$filters].set('StringFilter', operators);
    dispose!();

    expect(operators.size).toBe(0);
    expect(build[$$filters].size).toBe(0);
  });
});
