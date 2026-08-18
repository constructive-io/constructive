import { PgIntrospectionPlugin as publishedPlugin } from 'graphile-build-pg';
import { makeIntrospectionQuery as publishedQuery } from 'pg-introspection';

import {
  makeIntrospectionQuery,
  PgIntrospectionPlugin,
} from '../src';

describe('upstream introspection baseline', () => {
  it('starts with the published pg-introspection query unchanged', () => {
    expect(makeIntrospectionQuery()).toBe(publishedQuery());
  });

  it('preserves the published gather lifecycle contract', () => {
    expect(PgIntrospectionPlugin).not.toBe(publishedPlugin);
    expect(PgIntrospectionPlugin.name).toBe(publishedPlugin.name);
    expect(PgIntrospectionPlugin.before).toEqual(publishedPlugin.before);
    expect(PgIntrospectionPlugin.gather?.namespace).toBe(
      publishedPlugin.gather?.namespace
    );
    expect(Object.keys(PgIntrospectionPlugin.gather?.helpers ?? {}).sort()).toEqual(
      Object.keys(publishedPlugin.gather?.helpers ?? {}).sort()
    );
    expect(Object.keys(PgIntrospectionPlugin.gather?.hooks ?? {}).sort()).toEqual(
      Object.keys(publishedPlugin.gather?.hooks ?? {}).sort()
    );
  });
});
