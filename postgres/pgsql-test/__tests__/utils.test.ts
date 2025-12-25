import {
  IdHash,
  prune,
  pruneDates,
  pruneHashes,
  pruneIdArrays,
  pruneIds,
  pruneUUIDs,
  snapshot} from '../src/utils';

describe('snapshot utilities', () => {
  describe('pruneDates', () => {
    it('replaces Date objects with [DATE]', () => {
      const row = { created_at: new Date('2024-01-15'), name: 'Alice' };
      expect(pruneDates(row)).toEqual({ created_at: '[DATE]', name: 'Alice' });
    });

    it('replaces date strings in fields ending with _at', () => {
      const row = { updated_at: '2024-01-15T10:30:00Z', name: 'Bob' };
      expect(pruneDates(row)).toEqual({ updated_at: '[DATE]', name: 'Bob' });
    });

    it('replaces date strings in fields ending with At', () => {
      const row = { createdAt: '2024-01-15T10:30:00Z', name: 'Carol' };
      expect(pruneDates(row)).toEqual({ createdAt: '[DATE]', name: 'Carol' });
    });

    it('preserves null and undefined values', () => {
      const row: Record<string, unknown> = { created_at: null, updated_at: undefined };
      expect(pruneDates(row)).toEqual({ created_at: null, updated_at: undefined });
    });
  });

  describe('pruneIds', () => {
    it('replaces id field with [ID]', () => {
      const row = { id: 123, name: 'Alice' };
      expect(pruneIds(row)).toEqual({ id: '[ID]', name: 'Alice' });
    });

    it('replaces fields ending with _id', () => {
      const row = { user_id: 456, org_id: 'abc-123', name: 'Bob' };
      expect(pruneIds(row)).toEqual({ user_id: '[ID]', org_id: '[ID]', name: 'Bob' });
    });

    it('preserves null id values', () => {
      const row: Record<string, unknown> = { id: null, user_id: undefined };
      expect(pruneIds(row)).toEqual({ id: null, user_id: undefined });
    });

  });

  describe('pruneIdArrays', () => {
    it('replaces fields ending with _ids with [UUIDs-N]', () => {
      const row = { user_ids: ['a', 'b', 'c'], name: 'Alice' };
      expect(pruneIdArrays(row)).toEqual({ user_ids: '[UUIDs-3]', name: 'Alice' });
    });

    it('handles empty arrays', () => {
      const row: Record<string, unknown> = { tag_ids: [] };
      expect(pruneIdArrays(row)).toEqual({ tag_ids: '[UUIDs-0]' });
    });
  });

  describe('pruneUUIDs', () => {
    it('replaces uuid field with [UUID]', () => {
      const row = { uuid: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice' };
      expect(pruneUUIDs(row)).toEqual({ uuid: '[UUID]', name: 'Alice' });
    });

    it('replaces queue_name field with [UUID]', () => {
      const row = { queue_name: '550e8400-e29b-41d4-a716-446655440000' };
      expect(pruneUUIDs(row)).toEqual({ queue_name: '[UUID]' });
    });

    it('replaces gravatar hash with [gUUID]', () => {
      const row = { gravatar: 'd41d8cd98f00b204e9800998ecf8427e' };
      expect(pruneUUIDs(row)).toEqual({ gravatar: '[gUUID]' });
    });

    it('does not replace non-UUID strings', () => {
      const row = { uuid: 'not-a-uuid', name: 'Bob' };
      expect(pruneUUIDs(row)).toEqual({ uuid: 'not-a-uuid', name: 'Bob' });
    });
  });

  describe('pruneHashes', () => {
    it('replaces fields ending with _hash that start with $', () => {
      const row = { password_hash: '$2b$10$abc123', name: 'Alice' };
      expect(pruneHashes(row)).toEqual({ password_hash: '[hash]', name: 'Alice' });
    });

    it('does not replace hash fields not starting with $', () => {
      const row = { content_hash: 'abc123def456' };
      expect(pruneHashes(row)).toEqual({ content_hash: 'abc123def456' });
    });
  });

  describe('prune', () => {
    it('applies all prune functions', () => {
      const row = {
        id: 1,
        user_id: 2,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date('2024-01-15'),
        password_hash: '$2b$10$abc123',
        name: 'Alice'
      };
      expect(prune(row)).toEqual({
        id: '[ID]',
        user_id: '[ID]',
        uuid: '[UUID]',
        created_at: '[DATE]',
        password_hash: '[hash]',
        name: 'Alice'
      });
    });

  });

  describe('snapshot', () => {
    it('recursively prunes arrays', () => {
      const data = [
        { id: 1, name: 'Alice', created_at: '2024-01-15T10:00:00Z' },
        { id: 2, name: 'Bob', created_at: '2024-01-16T10:00:00Z' }
      ];
      expect(snapshot(data)).toEqual([
        { id: '[ID]', name: 'Alice', created_at: '[DATE]' },
        { id: '[ID]', name: 'Bob', created_at: '[DATE]' }
      ]);
    });

    it('recursively prunes nested objects', () => {
      const data = {
        user: {
          id: 1,
          profile: {
            user_id: 1,
            created_at: '2024-01-15T10:00:00Z'
          }
        }
      };
      expect(snapshot(data)).toEqual({
        user: {
          id: '[ID]',
          profile: {
            user_id: '[ID]',
            created_at: '[DATE]'
          }
        }
      });
    });

    it('handles mixed arrays and objects', () => {
      const data = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        meta: {
          total: 2,
          fetched_at: '2024-01-15T10:00:00Z'
        }
      };
      expect(snapshot(data)).toEqual({
        users: [
          { id: '[ID]', name: 'Alice' },
          { id: '[ID]', name: 'Bob' }
        ],
        meta: {
          total: 2,
          fetched_at: '[DATE]'
        }
      });
    });

    it('returns primitives unchanged', () => {
      expect(snapshot('hello')).toBe('hello');
      expect(snapshot(42)).toBe(42);
      expect(snapshot(null)).toBe(null);
      expect(snapshot(undefined)).toBe(undefined);
    });

  });

  describe('IdHash support', () => {
    it('pruneIds uses IdHash to map IDs to numbered placeholders', () => {
      const idHash: IdHash = { 'uuid-1': 1, 'uuid-2': 2 };
      const row = { id: 'uuid-1', user_id: 'uuid-2', org_id: 'unknown', name: 'Alice' };
      expect(pruneIds(row, idHash)).toEqual({
        id: '[ID-1]',
        user_id: '[ID-2]',
        org_id: '[ID]',
        name: 'Alice'
      });
    });

    it('prune applies IdHash mapping when provided', () => {
      const idHash: IdHash = { '1': 1, '2': 2 };
      const row = { id: 1, user_id: 2, name: 'Alice' };
      expect(prune(row, idHash)).toEqual({
        id: '[ID-1]',
        user_id: '[ID-2]',
        name: 'Alice'
      });
    });

    it('snapshot uses IdHash to preserve ID relationships', () => {
      const idHash: IdHash = {
        'user-uuid-1': 1,
        'user-uuid-2': 2,
        'post-uuid-1': 3
      };
      const data = [
        { id: 'user-uuid-1', name: 'Alice', post_id: 'post-uuid-1' },
        { id: 'user-uuid-2', name: 'Bob', post_id: 'post-uuid-1' }
      ];
      expect(snapshot(data, idHash)).toEqual([
        { id: '[ID-1]', name: 'Alice', post_id: '[ID-3]' },
        { id: '[ID-2]', name: 'Bob', post_id: '[ID-3]' }
      ]);
    });

    it('snapshot uses IdHash with nested objects', () => {
      const idHash: IdHash = { 'org-1': 1, 'user-1': 2 };
      const data = {
        org: { id: 'org-1', name: 'Acme' },
        user: { id: 'user-1', org_id: 'org-1' }
      };
      expect(snapshot(data, idHash)).toEqual({
        org: { id: '[ID-1]', name: 'Acme' },
        user: { id: '[ID-2]', org_id: '[ID-1]' }
      });
    });

    it('snapshot uses IdHash with string labels', () => {
      const idHash: IdHash = {
        'uuid-user-1': 'user1',
        'uuid-user-2': 'user2',
        'uuid-group-1': 'group1',
        'uuid-group-2': 'group2'
      };
      const data = [
        { actor_id: 'uuid-user-2', entity_id: 'uuid-group-2', is_admin: true }
      ];
      expect(snapshot(data, idHash)).toEqual([
        { actor_id: '[ID-user2]', entity_id: '[ID-group2]', is_admin: true }
      ]);
    });
  });
});
