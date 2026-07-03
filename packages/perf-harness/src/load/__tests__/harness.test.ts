import { DEFAULT_OPS, findTokenSelection, scoreTokenField } from '../harness';

// A minimal introspection type index: Map<typeName, { kind, name, fields }>.
// `findTokenSelection` follows each field's named type through the index, so
// every referenced type (scalars included) must be present.
function buildIndex(types: any[]): Map<string, any> {
  const index = new Map<string, any>();
  for (const t of types) index.set(t.name, t);
  return index;
}

const STRING = { kind: 'SCALAR', name: 'String' };
const scalar = (name: string) => ({ name, type: { kind: 'SCALAR', name: 'String' } });
const object = (name: string, typeName: string) => ({ name, type: { kind: 'OBJECT', name: typeName } });

describe('scoreTokenField', () => {
  test('accessToken exact match scores highest', () => {
    expect(scoreTokenField('accessToken')).toBe(4);
    expect(scoreTokenField('accesstoken')).toBe(4);
    expect(scoreTokenField('ACCESSTOKEN')).toBe(4);
  });

  test('contains-accessToken beats plain token beats jwt beats nothing', () => {
    expect(scoreTokenField('userAccessToken')).toBe(3);
    expect(scoreTokenField('token')).toBe(2);
    expect(scoreTokenField('refreshToken')).toBe(2);
    expect(scoreTokenField('jwt')).toBe(1);
    expect(scoreTokenField('jwtBlob')).toBe(1);
    expect(scoreTokenField('id')).toBe(0);
    expect(scoreTokenField('clientMutationId')).toBe(0);
  });

  test('strict ordering: accessToken > userAccessToken > token > jwt > other', () => {
    const s = scoreTokenField;
    expect(s('accessToken')).toBeGreaterThan(s('userAccessToken'));
    expect(s('userAccessToken')).toBeGreaterThan(s('token'));
    expect(s('token')).toBeGreaterThan(s('jwt'));
    expect(s('jwt')).toBeGreaterThan(s('email'));
  });
});

describe('findTokenSelection', () => {
  test('descends one level into an object field (result { accessToken })', () => {
    const index = buildIndex([
      STRING,
      { kind: 'OBJECT', name: 'SignInResult', fields: [scalar('accessToken')] },
      { kind: 'OBJECT', name: 'SignInPayload', fields: [scalar('clientMutationId'), object('result', 'SignInResult')] }
    ]);
    const sel = findTokenSelection(index, 'SignInPayload');
    expect(sel).not.toBeNull();
    expect(sel.selection).toBe('result { accessToken }');
    expect(sel.path).toEqual(['result', 'accessToken']);
    expect(sel.score).toBe(4);
  });

  test('prefers a direct scalar accessToken over a plain token (early return at score>=3)', () => {
    const index = buildIndex([
      STRING,
      { kind: 'OBJECT', name: 'SignInPayloadFlat', fields: [scalar('token'), scalar('accessToken')] }
    ]);
    const sel = findTokenSelection(index, 'SignInPayloadFlat');
    expect(sel.selection).toBe('accessToken');
    expect(sel.path).toEqual(['accessToken']);
    expect(sel.score).toBe(4);
  });

  test('falls back to a nested jwt field when no higher-scoring field exists', () => {
    const index = buildIndex([
      STRING,
      { kind: 'OBJECT', name: 'JwtResult', fields: [scalar('jwt')] },
      { kind: 'OBJECT', name: 'JwtPayload', fields: [scalar('clientMutationId'), object('result', 'JwtResult')] }
    ]);
    const sel = findTokenSelection(index, 'JwtPayload');
    expect(sel.selection).toBe('result { jwt }');
    expect(sel.path).toEqual(['result', 'jwt']);
    expect(sel.score).toBe(1);
  });

  test('returns null when no token-ish field is present', () => {
    const index = buildIndex([
      STRING,
      { kind: 'OBJECT', name: 'BoringPayload', fields: [scalar('id'), scalar('clientMutationId')] }
    ]);
    expect(findTokenSelection(index, 'BoringPayload')).toBeNull();
  });

  test('returns null when the payload type is not in the index', () => {
    const index = buildIndex([STRING]);
    expect(findTokenSelection(index, 'Nonexistent')).toBeNull();
  });
});

describe('DEFAULT_OPS', () => {
  test('has the canonical categories fallback shape', () => {
    const ops = DEFAULT_OPS();
    expect(ops.read).toBe('categories');
    expect(ops.meta).toBe(true);
    expect(ops.queryType).toBeNull();
    expect(ops.mutationType).toBeNull();
    expect(ops.create).toEqual({
      name: 'createCategory',
      inputTypeName: 'CreateCategoryInput',
      innerName: 'category',
      requiredScalars: [
        { name: 'name', scalar: 'String', kind: 'SCALAR' },
        { name: 'slug', scalar: 'String', kind: 'SCALAR' }
      ],
      payloadFieldName: 'category',
      keySelect: 'id'
    });
    expect(ops.del).toEqual({ name: 'deleteCategory', inputTypeName: 'DeleteCategoryInput', key: 'id' });
  });

  test('is a factory — each call returns an independent object the harness can mutate', () => {
    const a = DEFAULT_OPS();
    const b = DEFAULT_OPS();
    expect(a).not.toBe(b);
    expect(a.create).not.toBe(b.create);
    // The harness downgrades a tenant by setting ops.read = null after a probe;
    // that must not bleed into the next fallback.
    a.read = null;
    a.create = null;
    expect(DEFAULT_OPS().read).toBe('categories');
    expect(DEFAULT_OPS().create).not.toBeNull();
  });
});
