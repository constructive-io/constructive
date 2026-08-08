import { minimalCoveringSet } from '../src/commands/test-packages';

const moduleMap: Record<string, { requires: string[] }> = {
  plpgsql: { requires: [] },
  ast: { requires: ['plpgsql'] },
  'ast-plpgsql': { requires: ['ast'] },
  metaschema: { requires: ['ast-plpgsql'] },
  app: { requires: ['metaschema'] },
  seeds: { requires: ['app'] },
  standalone: { requires: [] }
};

const names = Object.keys(moduleMap);

describe('minimalCoveringSet', () => {
  it('keeps only the modules nothing else requires', () => {
    const { selected, coveredBy } = minimalCoveringSet(moduleMap, names);

    expect(selected).toEqual(['seeds', 'standalone']);
    expect(coveredBy.has('ast')).toBe(true);
    expect(coveredBy.has('standalone')).toBe(false);
  });

  it('promotes a module whose only dependent was excluded', () => {
    const { selected } = minimalCoveringSet(
      moduleMap,
      names.filter((name) => name !== 'seeds')
    );

    expect(selected).toEqual(['app', 'standalone']);
  });

  it('promotes a dependency shared by two excluded dependents', () => {
    const { selected } = minimalCoveringSet(
      { ...moduleMap, other: { requires: ['metaschema'] } },
      names.filter((name) => name !== 'seeds' && name !== 'app')
    );

    expect(selected).toEqual(['metaschema', 'standalone']);
  });

  it('covers every candidate through the selected closures', () => {
    const { selected, coveredBy } = minimalCoveringSet(moduleMap, names);

    expect(selected.length + coveredBy.size).toBe(names.length);
  });

  it('selects a module with no dependents even when it is also a dependency of nothing', () => {
    const { selected } = minimalCoveringSet(moduleMap, ['plpgsql', 'standalone']);

    expect(selected).toEqual(['plpgsql', 'standalone']);
  });
});
