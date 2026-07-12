import {
  buildInvocationPayload,
  deriveInputFields,
  isGraphqlEnabled
} from '../derive';
import type { FunctionBindingRow } from '../types';

const baseBinding: FunctionBindingRow = {
  bindingId: 'b1',
  alias: 'resize_image',
  config: null,
  functionDefinitionId: 'd1',
  taskIdentifier: 'images:resize',
  databaseId: 'db1',
  description: null,
  payloadArgs: null
};

describe('isGraphqlEnabled', () => {
  it('is enabled when config is null', () => {
    expect(isGraphqlEnabled(null)).toBe(true);
  });

  it('is enabled when graphql key is absent', () => {
    expect(isGraphqlEnabled({ rest: { path: '/resize' } })).toBe(true);
  });

  it('is enabled when graphql is true', () => {
    expect(isGraphqlEnabled({ graphql: true })).toBe(true);
  });

  it('is disabled when graphql is false', () => {
    expect(isGraphqlEnabled({ graphql: false })).toBe(false);
  });
});

describe('deriveInputFields', () => {
  it('falls back to a single JSON payload field with no metadata', () => {
    const derived = deriveInputFields(baseBinding);
    expect(derived.source).toBe('fallback');
    expect(derived.fields).toHaveLength(1);
    expect(derived.fields[0]).toMatchObject({
      name: 'payload',
      scalar: 'JSON',
      required: false,
      list: false
    });
  });

  it('falls back when payload_args is an empty array', () => {
    const derived = deriveInputFields({ ...baseBinding, payloadArgs: [] });
    expect(derived.source).toBe('fallback');
  });

  it('derives nullable scalar fields from payload_args', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      payloadArgs: [
        { name: 'url', type: 'text' },
        { name: 'width', type: 'int' },
        { name: 'id', type: 'uuid' },
        { name: 'ratio', type: 'numeric' },
        { name: 'force', type: 'boolean' },
        { name: 'meta', type: 'jsonb' },
        { name: 'at', type: 'timestamptz' },
        { name: 'other', type: 'unknown_type' }
      ]
    });
    expect(derived.source).toBe('payload-args');
    expect(derived.fields.map((f) => [f.name, f.scalar, f.required])).toEqual([
      ['url', 'String', false],
      ['width', 'Int', false],
      ['id', 'UUID', false],
      ['ratio', 'BigFloat', false],
      ['force', 'Boolean', false],
      ['meta', 'JSON', false],
      ['at', 'Datetime', false],
      ['other', 'JSON', false]
    ]);
  });

  it('falls back when payload_args entries are malformed', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      payloadArgs: [{ name: '', type: 'text' }]
    });
    expect(derived.source).toBe('fallback');
  });

  it('derives fields from a JSON Schema in binding config', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      config: {
        schema: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: { type: 'string', enum: ['fast', 'slow'] },
            count: { type: 'integer' },
            price: { type: 'number' },
            flag: { type: 'boolean' },
            tags: { type: 'array', items: { type: 'string' } },
            nested: { type: 'object' }
          }
        }
      }
    });
    expect(derived.source).toBe('schema');
    const byName = Object.fromEntries(derived.fields.map((f) => [f.name, f]));
    expect(byName.mode).toMatchObject({ required: true, enumValues: ['fast', 'slow'] });
    expect(byName.count).toMatchObject({ scalar: 'Int', required: false });
    expect(byName.price).toMatchObject({ scalar: 'Float' });
    expect(byName.flag).toMatchObject({ scalar: 'Boolean' });
    expect(byName.tags).toMatchObject({ scalar: 'String', list: true });
    expect(byName.nested).toMatchObject({ scalar: 'JSON' });
  });

  it('prefers config schema over payload_args', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      config: {
        schema: {
          type: 'object',
          properties: { only: { type: 'string' } }
        }
      },
      payloadArgs: [{ name: 'url', type: 'text' }]
    });
    expect(derived.source).toBe('schema');
    expect(derived.fields.map((f) => f.name)).toEqual(['only']);
  });

  it('ignores non-object config schemas', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      config: { schema: { type: 'string' } }
    });
    expect(derived.source).toBe('fallback');
  });
});

describe('buildInvocationPayload', () => {
  it('passes the payload through verbatim in fallback mode', () => {
    const derived = deriveInputFields(baseBinding);
    expect(buildInvocationPayload(derived, { payload: { a: 1 } })).toEqual({ a: 1 });
    expect(buildInvocationPayload(derived, {})).toBeNull();
  });

  it('builds a keyed payload from typed fields, omitting undefined', () => {
    const derived = deriveInputFields({
      ...baseBinding,
      payloadArgs: [
        { name: 'url', type: 'text' },
        { name: 'width', type: 'int' }
      ]
    });
    expect(buildInvocationPayload(derived, { url: 'x', width: undefined })).toEqual({
      url: 'x'
    });
    expect(buildInvocationPayload(derived, { url: 'x', width: null })).toEqual({
      url: 'x',
      width: null
    });
  });
});
