
import {
  targetMatches,
  findMatchingRules,
  type AuthzRule,
  type OperationType,
} from '../types/rules';

describe('Rule Matching', () => {
  describe('targetMatches', () => {
    it('matches exact schema and table', () => {
      const target = { schema: 'public', table: 'users' };
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'posts', 'select')).toBe(false);
      expect(targetMatches(target, 'private', 'users', 'select')).toBe(false);
    });

    it('matches wildcard schema', () => {
      const target = { schema: '*', table: 'users' };
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'private', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'posts', 'select')).toBe(false);
    });

    it('matches wildcard table', () => {
      const target = { schema: 'public', table: '*' };
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'posts', 'select')).toBe(true);
      expect(targetMatches(target, 'private', 'users', 'select')).toBe(false);
    });

    it('matches glob patterns', () => {
      const target = { schema: 'app_*', table: 'user_*' };
      expect(targetMatches(target, 'app_public', 'user_profiles', 'select')).toBe(true);
      expect(targetMatches(target, 'app_private', 'user_settings', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'user_profiles', 'select')).toBe(false);
      expect(targetMatches(target, 'app_public', 'posts', 'select')).toBe(false);
    });

    it('matches specific operations', () => {
      const target = { schema: 'public', table: 'users', operations: ['select', 'update'] as OperationType[] };
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'users', 'update')).toBe(true);
      expect(targetMatches(target, 'public', 'users', 'delete')).toBe(false);
      expect(targetMatches(target, 'public', 'users', 'insert')).toBe(false);
    });

    it('matches all operations when not specified', () => {
      const target = { schema: 'public', table: 'users' };
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'public', 'users', 'insert')).toBe(true);
      expect(targetMatches(target, 'public', 'users', 'update')).toBe(true);
      expect(targetMatches(target, 'public', 'users', 'delete')).toBe(true);
    });

    it('matches when no schema/table specified', () => {
      const target = {};
      expect(targetMatches(target, 'public', 'users', 'select')).toBe(true);
      expect(targetMatches(target, 'any', 'thing', 'delete')).toBe(true);
    });
  });

  describe('findMatchingRules', () => {
    const rules: AuthzRule[] = [
      {
        id: 'admin-access',
        name: 'Admin full access',
        target: { schema: '*', table: '*' },
        policy: { AuthzMembership: { membership_type: 1, is_admin: true } },
        priority: 100,
      },
      {
        id: 'users-own-data',
        name: 'Users own data',
        target: { schema: 'public', table: 'user_profiles' },
        policy: { AuthzDirectOwner: { entity_field: 'user_id' } },
        priority: 50,
      },
      {
        id: 'org-access',
        name: 'Org member access',
        target: { schema: 'public', table: 'org_*' },
        policy: { AuthzMembershipByField: { entity_field: 'org_id', membership_type: 2 } },
        priority: 50,
      },
      {
        id: 'disabled-rule',
        name: 'Disabled rule',
        target: { schema: '*', table: '*' },
        policy: { AuthzDenyAll: {} },
        enabled: false,
      },
    ];

    it('finds matching rules sorted by priority', () => {
      const matches = findMatchingRules(rules, 'public', 'user_profiles', 'select');
      expect(matches).toHaveLength(2);
      expect(matches[0].id).toBe('admin-access');
      expect(matches[1].id).toBe('users-own-data');
    });

    it('excludes disabled rules', () => {
      const matches = findMatchingRules(rules, 'public', 'anything', 'select');
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('admin-access');
    });

    it('matches glob patterns', () => {
      const matches = findMatchingRules(rules, 'public', 'org_settings', 'select');
      expect(matches).toHaveLength(2);
      expect(matches.map((r) => r.id)).toContain('admin-access');
      expect(matches.map((r) => r.id)).toContain('org-access');
    });

    it('returns empty array when no rules match', () => {
      const matches = findMatchingRules(rules, 'private', 'secrets', 'select');
      expect(matches).toHaveLength(1); // Only admin-access matches *.*
    });
  });
});
