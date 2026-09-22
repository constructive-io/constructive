import type { ConstructiveOptions, PgScopedIntrospectionServiceConfig } from '@constructive-io/graphql-types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { getGraphQLEnvVars } from '../src/env';
import { getEnvOptions } from '../src/merge';

const switchName = 'GRAPHILE_SCOPED_INTROSPECTION';
const catalogName = `${switchName}_CATALOG_TYPES`;
const extensionsName = `${switchName}_CAPABILITY_EXTENSIONS`;
const scoped = (options: Partial<ConstructiveOptions>) =>
  options.graphile?.preset?.gather?.pgScopedIntrospection;
const optionsFor = (main: PgScopedIntrospectionServiceConfig): Partial<ConstructiveOptions> => ({
  graphile: { preset: { gather: { pgScopedIntrospection: { main } } } }
});

describe('scoped introspection environment variables', () => {
  it.each([{}, { [switchName]: '' }, { [switchName]: '  ' }])(
    'leaves the feature absent for %j', (environment) => {
      expect(scoped(getGraphQLEnvVars(environment))).toBeUndefined();
    }
  );

  it.each([
    [{ [switchName]: 'true' }, {}],
    [{ [switchName]: 'false' }, false],
    [{ [switchName]: ' true ' }, {}],
    [{ [catalogName]: 'all' }, { catalogTypes: 'all' }],
    [{ [switchName]: '', [catalogName]: 'dependency-closure' }, { catalogTypes: 'dependency-closure' }],
    [{ [extensionsName]: ' pg_trgm, vector,pg_trgm ' }, { capabilityExtensions: ['pg_trgm', 'vector'] }],
    [{ [extensionsName]: '' }, { capabilityExtensions: [] }],
    [{ [extensionsName]: '  ' }, { capabilityExtensions: [] }]
  ])('maps %j to main only', (environment, expected) => {
    expect(scoped(getGraphQLEnvVars(environment as NodeJS.ProcessEnv))).toEqual({ main: expected });
  });

  it.each([
    [switchName, 'tru'], [switchName, '1'], [switchName, 'TRUE'],
    [catalogName, 'invalid'], [catalogName, ''], [catalogName, ' all '],
    [extensionsName, 'pg_trgm,,vector'], [extensionsName, ',vector'],
    [extensionsName, 'pg_trgm,'], [extensionsName, 'pg_trgm, ,vector']
  ])('rejects malformed %s=%s with its variable name', (name, value) => {
    expect(() => getGraphQLEnvVars({ [name]: value })).toThrow(name);
  });

  it('lets explicit false ignore malformed advanced settings', () => {
    expect(scoped(getGraphQLEnvVars({
      [switchName]: 'false', [catalogName]: 'invalid', [extensionsName]: ',,'
    }))).toEqual({ main: false });
  });

  it('uses injected environment values without reading the process environment', () => {
    const previous = process.env[switchName];
    process.env[switchName] = 'invalid';
    try {
      expect(scoped(getGraphQLEnvVars({}))).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env[switchName];
      else process.env[switchName] = previous;
    }
  });
});

describe('scoped introspection configuration precedence', () => {
  let directory: string;
  const configured = {
    catalogTypes: 'dependency-closure' as const,
    capabilityExtensions: ['pg_trgm', 'vector']
  };

  const configure = (main: PgScopedIntrospectionServiceConfig) => {
    fs.writeFileSync(path.join(directory, 'pgpm.json'), JSON.stringify({
      graphile: {
        schema: ['app'],
        preset: { gather: { pgScopedIntrospection: { main, secondary: false } } }
      }
    }));
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'graphql-env-scoped-'));
    configure(configured);
  });
  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  it.each([{}, { [switchName]: 'true' }])('preserves configured advanced settings for %j', (environment) => {
    const result = getEnvOptions({}, directory, environment);
    expect(scoped(result)).toEqual({ main: configured, secondary: false });
    expect(result.graphile?.schema).toEqual(['app']);
  });

  it('overrides only the supplied field', () => {
    expect(scoped(getEnvOptions({}, directory, { [catalogName]: 'all' }))).toEqual({
      main: { ...configured, catalogTypes: 'all' }, secondary: false
    });
  });

  it.each([
    ['hstore,hstore', ['hstore']], ['', []]
  ])('replaces the entire extension list with %j', (value, expected) => {
    expect(scoped(getEnvOptions({}, directory, { [extensionsName]: value as string }))?.main).toEqual({
      ...configured, capabilityExtensions: expected
    });
  });

  it.each([false, true])('enables advanced settings over configured main=%s', (main) => {
    configure(main);
    expect(scoped(getEnvOptions({}, directory, { [catalogName]: 'all' }))?.main).toEqual({ catalogTypes: 'all' });
  });

  it('lets the false switch override configured settings and advanced variables', () => {
    expect(scoped(getEnvOptions({}, directory, {
      [switchName]: 'false', [catalogName]: 'all', [extensionsName]: 'hstore'
    }))).toEqual({ main: false, secondary: false });
  });

  it.each([true, false, { capabilityExtensions: [] }])('gives runtime main=%j priority over env false', (main) => {
    expect(scoped(getEnvOptions(optionsFor(main), directory, { [switchName]: 'false' }))?.main).toEqual(main);
  });

  it.each([true, false])('gives runtime main=%s priority over enabled environment options', (main) => {
    expect(scoped(getEnvOptions(optionsFor(main), directory, {
      [catalogName]: 'all', [extensionsName]: 'vector'
    }))?.main).toBe(main);
  });

  it('merges runtime option fields last and replaces their arrays', () => {
    expect(scoped(getEnvOptions(optionsFor({ capabilityExtensions: ['hstore'] }), directory, {
      [catalogName]: 'all', [extensionsName]: 'vector'
    }))?.main).toEqual({ catalogTypes: 'all', capabilityExtensions: ['hstore'] });
  });

  it('keeps stock defaults when neither file nor environment configures the feature', () => {
    fs.writeFileSync(path.join(directory, 'pgpm.json'), '{}');
    expect(getEnvOptions({}, directory, {}).graphile).toEqual({
      schema: [],
      extends: [],
      preset: {},
      cache: { max: 50, ttl: 31622400000 }
    });
  });
});
