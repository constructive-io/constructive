
import {
  createAuthzPlugin,
  createAuthzPreset,
  defineRule,
  defineRules,
  CommonRules,
} from '../plugin';
import type { AuthzRule } from '../types/rules';

describe('Plugin', () => {
  describe('createAuthzPlugin', () => {
    it('creates a plugin with the correct name', () => {
      const plugin = createAuthzPlugin({ rules: [] });
      expect(plugin.name).toBe('AuthzPlugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('includes schema hooks', () => {
      const plugin = createAuthzPlugin({ rules: [] });
      expect(plugin.schema).toBeDefined();
      expect(plugin.schema?.hooks).toBeDefined();
    });
  });

  describe('createAuthzPreset', () => {
    it('creates a preset with the plugin', () => {
      const preset = createAuthzPreset({ rules: [] });
      expect(preset.plugins).toHaveLength(1);
      expect(preset.plugins?.[0].name).toBe('AuthzPlugin');
    });
  });

  describe('defineRule', () => {
    it('returns the rule unchanged', () => {
      const rule: AuthzRule = {
        id: 'test',
        name: 'Test Rule',
        target: { schema: 'public', table: 'users' },
        policy: { AuthzDirectOwner: { entity_field: 'owner_id' } },
      };
      expect(defineRule(rule)).toBe(rule);
    });
  });

  describe('defineRules', () => {
    it('returns the rules unchanged', () => {
      const rules: AuthzRule[] = [
        {
          id: 'test1',
          name: 'Test Rule 1',
          target: { schema: 'public', table: 'users' },
          policy: { AuthzDirectOwner: { entity_field: 'owner_id' } },
        },
        {
          id: 'test2',
          name: 'Test Rule 2',
          target: { schema: 'public', table: 'posts' },
          policy: { AuthzAllowAll: {} },
        },
      ];
      expect(defineRules(rules)).toBe(rules);
    });
  });

  describe('CommonRules', () => {
    describe('ownDataOnly', () => {
      it('creates a direct owner rule with defaults', () => {
        const rule = CommonRules.ownDataOnly();
        expect(rule.id).toBe('own-data-only');
        expect(rule.target.schema).toBe('*');
        expect(rule.target.table).toBe('*');
        expect(rule.policy).toEqual({
          AuthzDirectOwner: { entity_field: 'owner_id' },
        });
      });

      it('accepts custom options', () => {
        const rule = CommonRules.ownDataOnly({
          schema: 'public',
          table: 'user_profiles',
          ownerField: 'user_id',
          operations: ['select', 'update'],
        });
        expect(rule.target.schema).toBe('public');
        expect(rule.target.table).toBe('user_profiles');
        expect(rule.target.operations).toEqual(['select', 'update']);
        expect(rule.policy).toEqual({
          AuthzDirectOwner: { entity_field: 'user_id' },
        });
      });
    });

    describe('orgMemberAccess', () => {
      it('creates an org membership rule with defaults', () => {
        const rule = CommonRules.orgMemberAccess();
        expect(rule.id).toBe('org-member-access');
        expect(rule.policy).toEqual({
          AuthzMembershipByField: {
            entity_field: 'org_id',
            membership_type: 2,
            permission: undefined,
          },
        });
      });

      it('accepts permission option', () => {
        const rule = CommonRules.orgMemberAccess({ permission: 'read' });
        expect(rule.policy).toEqual({
          AuthzMembershipByField: {
            entity_field: 'org_id',
            membership_type: 2,
            permission: 'read',
          },
        });
      });
    });

    describe('publishedOnly', () => {
      it('creates a publishable rule with defaults', () => {
        const rule = CommonRules.publishedOnly();
        expect(rule.id).toBe('published-only');
        expect(rule.target.operations).toEqual(['select']);
        expect(rule.policy).toEqual({
          AuthzPublishable: {
            is_published_field: undefined,
            published_at_field: undefined,
          },
        });
      });

      it('accepts custom field names', () => {
        const rule = CommonRules.publishedOnly({
          isPublishedField: 'visible',
          publishedAtField: 'made_public_at',
        });
        expect(rule.policy).toEqual({
          AuthzPublishable: {
            is_published_field: 'visible',
            published_at_field: 'made_public_at',
          },
        });
      });
    });

    describe('adminFullAccess', () => {
      it('creates an admin rule with high priority', () => {
        const rule = CommonRules.adminFullAccess();
        expect(rule.id).toBe('admin-full-access');
        expect(rule.priority).toBe(100);
        expect(rule.policy).toEqual({
          AuthzMembership: {
            membership_type: 1,
            is_admin: true,
          },
        });
      });

      it('accepts custom membership type', () => {
        const rule = CommonRules.adminFullAccess({ membershipType: 'org' });
        expect(rule.policy).toEqual({
          AuthzMembership: {
            membership_type: 'org',
            is_admin: true,
          },
        });
      });
    });

    describe('denyAll', () => {
      it('creates a deny rule with low priority', () => {
        const rule = CommonRules.denyAll();
        expect(rule.id).toBe('deny-all');
        expect(rule.priority).toBe(-100);
        expect(rule.policy).toEqual({ AuthzDenyAll: {} });
      });
    });

    describe('allowAll', () => {
      it('creates an allow rule', () => {
        const rule = CommonRules.allowAll();
        expect(rule.id).toBe('allow-all');
        expect(rule.policy).toEqual({ AuthzAllowAll: {} });
      });
    });
  });
});
