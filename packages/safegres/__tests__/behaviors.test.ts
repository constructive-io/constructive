import { deniesAll, parseBehaviorTag, parseFragments, resolveAbility } from '../src/pg/behaviors';

describe('behavior tag parsing', () => {
  it('reads the tag out of the leading smart-tag block', () => {
    expect(parseBehaviorTag('@behavior -list -connection')).toBe('-list -connection');
    expect(parseBehaviorTag('@omit\n@behavior -list\nA description.')).toBe('-list');
  });

  it('stops at the description — a later @behavior is prose, not a tag', () => {
    expect(parseBehaviorTag('Some prose.\n@behavior -list')).toBeNull();
  });

  it('has nothing to say about a comment without one', () => {
    expect(parseBehaviorTag(null)).toBeNull();
    expect(parseBehaviorTag('')).toBeNull();
    expect(parseBehaviorTag('Just a description.')).toBeNull();
    // `@omit` is a different question, deliberately not translated into one.
    expect(parseBehaviorTag('@omit many')).toBeNull();
  });

  it('splits fragments, treating a bare scope as a grant', () => {
    expect(parseFragments('-list +connection single')).toEqual([
      { modifier: '-', scope: 'list' },
      { modifier: '+', scope: 'connection' },
      { modifier: '+', scope: 'single' }
    ]);
    expect(parseFragments('  -list   -connection  ')).toHaveLength(2);
    expect(parseFragments(null)).toEqual([]);
  });
});

describe('resolving an ability', () => {
  it('distinguishes denied, granted and undeclared', () => {
    expect(resolveAbility('-list', 'list')).toBe(false);
    expect(resolveAbility('+list', 'list')).toBe(true);
    // The one that matters: silence is not denial. A preset can still grant it.
    expect(resolveAbility('-connection', 'list')).toBeUndefined();
    expect(resolveAbility(null, 'list')).toBeUndefined();
  });

  it('lets the last matching fragment win, as PostGraphile does', () => {
    expect(resolveAbility('-* +list', 'list')).toBe(true);
    expect(resolveAbility('+list -list', 'list')).toBe(false);
    expect(resolveAbility('-*', 'connection')).toBe(false);
  });

  it('matches the ability against the final segment of a scope path', () => {
    expect(resolveAbility('-resource:connection', 'connection')).toBe(false);
    expect(resolveAbility('-constraint:resource:list', 'list')).toBe(false);
    expect(resolveAbility('-resource:connection', 'list')).toBeUndefined();
  });
});

describe('deniesAll', () => {
  const abilities = ['list', 'connection', 'single'];

  it('requires every ability to be explicitly denied', () => {
    expect(deniesAll('-list -connection -single', abilities)).toBe(true);
    expect(deniesAll('-*', abilities)).toBe(true);
    // Still reachable as a single record, so the path is not hidden.
    expect(deniesAll('-list -connection', abilities)).toBe(false);
    expect(deniesAll('-* +single', abilities)).toBe(false);
    expect(deniesAll(null, abilities)).toBe(false);
  });

  it('is false for an empty ability list rather than vacuously true', () => {
    expect(deniesAll('-*', [])).toBe(false);
  });
});
