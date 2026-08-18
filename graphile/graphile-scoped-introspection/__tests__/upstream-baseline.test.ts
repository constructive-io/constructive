import { PgIntrospectionPlugin as publishedPlugin } from 'graphile-build-pg';
import { makeIntrospectionQuery as publishedQuery } from 'pg-introspection';

import { makeIntrospectionQuery, PgScopedIntrospectionPlugin } from '../src';

describe('upstream introspection baseline', () => {
  it('starts with the published pg-introspection query unchanged', () => {
    expect(makeIntrospectionQuery()).toBe(publishedQuery());
  });

  it('preserves the published gather lifecycle contract', () => {
    expect(PgScopedIntrospectionPlugin).not.toBe(publishedPlugin);
    expect(PgScopedIntrospectionPlugin.provides).toContain(
      publishedPlugin.name
    );
    expect(PgScopedIntrospectionPlugin.before).toEqual(publishedPlugin.before);
    expect(PgScopedIntrospectionPlugin.gather?.namespace).toBe(
      publishedPlugin.gather?.namespace
    );
    expect(
      Object.keys(PgScopedIntrospectionPlugin.gather?.helpers ?? {}).sort()
    ).toEqual(Object.keys(publishedPlugin.gather?.helpers ?? {}).sort());
    expect(
      Object.keys(PgScopedIntrospectionPlugin.gather?.hooks ?? {}).sort()
    ).toEqual(Object.keys(publishedPlugin.gather?.hooks ?? {}).sort());
  });
});
