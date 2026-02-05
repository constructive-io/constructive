
import {
  generateSql,
  AuthzSql,
  type SqlGeneratorOptions,
} from '../evaluators/sql-generator';
import type { AuthzNode } from '../types/authz-nodes';

describe('SQL Generator', () => {
  const defaultOptions: SqlGeneratorOptions = {
    privateSchema: 'app_private',
    currentUserIdFunc: 'current_user_id()',
  };

  describe('AuthzDirectOwner', () => {
    it('generates simple owner check', () => {
      const node: AuthzNode = {
        AuthzDirectOwner: { entity_field: 'owner_id' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('"owner_id" = current_user_id()');
    });

    it('uses table alias when provided', () => {
      const node: AuthzNode = {
        AuthzDirectOwner: { entity_field: 'owner_id' },
      };
      const result = generateSql(node, { ...defaultOptions, tableAlias: 't' });
      expect(result.sql).toBe('"t"."owner_id" = current_user_id()');
    });

    it('escapes special characters in field names', () => {
      const node: AuthzNode = {
        AuthzDirectOwner: { entity_field: 'user"id' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('"user""id" = current_user_id()');
    });
  });

  describe('AuthzDirectOwnerAny', () => {
    it('generates OR logic for multiple fields', () => {
      const node: AuthzNode = {
        AuthzDirectOwnerAny: { entity_fields: ['owner_id', 'created_by'] },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe(
        '("owner_id" = current_user_id() OR "created_by" = current_user_id())'
      );
    });

    it('handles single field', () => {
      const node: AuthzNode = {
        AuthzDirectOwnerAny: { entity_fields: ['owner_id'] },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('"owner_id" = current_user_id()');
    });

    it('returns FALSE for empty fields', () => {
      const node: AuthzNode = {
        AuthzDirectOwnerAny: { entity_fields: [] },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('FALSE');
      expect(result.isAlwaysFalse).toBe(true);
    });
  });

  describe('AuthzMembership', () => {
    it('generates basic membership check', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 1 },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('EXISTS');
      expect(result.sql).toContain('"app_private"."app_memberships_sprt"');
      expect(result.sql).toContain('sprt."actor_id" = current_user_id()');
    });

    it('generates membership check with permission', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 2, permission: 'read' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"org_memberships_sprt"');
      expect(result.sql).toContain("get_permission_mask('read')");
    });

    it('generates membership check with is_admin', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 1, is_admin: true },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('sprt."is_admin" = TRUE');
    });

    it('generates membership check with is_owner', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 1, is_owner: true },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('sprt."is_owner" = TRUE');
    });

    it('combines is_admin and is_owner with OR by default', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 1, is_admin: true, is_owner: true },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('sprt."is_admin" = TRUE OR sprt."is_owner" = TRUE');
    });

    it('combines is_admin and is_owner with AND when specified', () => {
      const node: AuthzNode = {
        AuthzMembership: {
          membership_type: 1,
          is_admin: true,
          is_owner: true,
          admin_owner_logic: 'and',
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('sprt."is_admin" = TRUE AND sprt."is_owner" = TRUE');
    });

    it('handles string membership type', () => {
      const node: AuthzNode = {
        AuthzMembership: { membership_type: 'group' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"group_memberships_sprt"');
    });
  });

  describe('AuthzMembershipByField', () => {
    it('generates membership by field check', () => {
      const node: AuthzNode = {
        AuthzMembershipByField: { entity_field: 'org_id', membership_type: 2 },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"org_id" = ANY');
      expect(result.sql).toContain('SELECT sprt."entity_id"');
      expect(result.sql).toContain('"org_memberships_sprt"');
    });

    it('defaults to org membership type', () => {
      const node: AuthzNode = {
        AuthzMembershipByField: { entity_field: 'org_id' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"org_memberships_sprt"');
    });
  });

  describe('AuthzOrgHierarchy', () => {
    it('generates hierarchy check for downward visibility', () => {
      const node: AuthzNode = {
        AuthzOrgHierarchy: { direction: 'down', anchor_field: 'owner_id' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('EXISTS');
      expect(result.sql).toContain('"org_hierarchy_acl"');
      expect(result.sql).toContain('h."ancestor_id" = current_user_id()');
      expect(result.sql).toContain('h."descendant_id" = "owner_id"');
    });

    it('generates hierarchy check for upward visibility', () => {
      const node: AuthzNode = {
        AuthzOrgHierarchy: { direction: 'up', anchor_field: 'owner_id' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('h."descendant_id" = current_user_id()');
      expect(result.sql).toContain('h."ancestor_id" = "owner_id"');
    });

    it('includes max_depth when specified', () => {
      const node: AuthzNode = {
        AuthzOrgHierarchy: { direction: 'down', anchor_field: 'owner_id', max_depth: 3 },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('h."depth" <= 3');
    });
  });

  describe('AuthzTemporal', () => {
    it('generates valid_from check', () => {
      const node: AuthzNode = {
        AuthzTemporal: { valid_from_field: 'starts_at' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('"starts_at" <= NOW()');
    });

    it('generates valid_until check', () => {
      const node: AuthzNode = {
        AuthzTemporal: { valid_until_field: 'ends_at' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('("ends_at" IS NULL OR "ends_at" > NOW())');
    });

    it('generates combined temporal check', () => {
      const node: AuthzNode = {
        AuthzTemporal: { valid_from_field: 'starts_at', valid_until_field: 'ends_at' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"starts_at" <= NOW()');
      expect(result.sql).toContain('"ends_at" IS NULL OR "ends_at" > NOW()');
    });

    it('returns TRUE for empty temporal config', () => {
      const node: AuthzNode = {
        AuthzTemporal: {},
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('TRUE');
      expect(result.isAlwaysTrue).toBe(true);
    });
  });

  describe('AuthzPublishable', () => {
    it('generates publishable check with defaults', () => {
      const node: AuthzNode = {
        AuthzPublishable: {},
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"is_published" IS TRUE');
      expect(result.sql).toContain('"published_at" IS NOT NULL');
      expect(result.sql).toContain('"published_at" <= NOW()');
    });

    it('uses custom field names', () => {
      const node: AuthzNode = {
        AuthzPublishable: {
          is_published_field: 'visible',
          published_at_field: 'made_public_at',
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"visible" IS TRUE');
      expect(result.sql).toContain('"made_public_at"');
    });

    it('skips published_at check when not required', () => {
      const node: AuthzNode = {
        AuthzPublishable: { require_published_at: false },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('"is_published" IS TRUE');
    });
  });

  describe('AuthzArrayContainsActor', () => {
    it('generates array contains check', () => {
      const node: AuthzNode = {
        AuthzArrayContainsActor: { array_field: 'collaborator_ids' },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('current_user_id() = ANY("collaborator_ids")');
    });
  });

  describe('AuthzAllowAll / AuthzDenyAll', () => {
    it('generates TRUE for AllowAll', () => {
      const node: AuthzNode = { AuthzAllowAll: {} };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('TRUE');
      expect(result.isAlwaysTrue).toBe(true);
    });

    it('generates FALSE for DenyAll', () => {
      const node: AuthzNode = { AuthzDenyAll: {} };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('FALSE');
      expect(result.isAlwaysFalse).toBe(true);
    });
  });

  describe('AuthzComposite', () => {
    it('generates AND expression', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'AND_EXPR',
            args: [
              { AuthzDirectOwner: { entity_field: 'owner_id' } },
              { AuthzPublishable: {} },
            ],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain('"owner_id" = current_user_id()');
      expect(result.sql).toContain(' AND ');
      expect(result.sql).toContain('"is_published" IS TRUE');
    });

    it('generates OR expression', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'OR_EXPR',
            args: [
              { AuthzDirectOwner: { entity_field: 'owner_id' } },
              { AuthzMembership: { membership_type: 1, is_admin: true } },
            ],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain(' OR ');
    });

    it('generates NOT expression', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'NOT_EXPR',
            args: [{ AuthzDenyAll: {} }],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('TRUE');
      expect(result.isAlwaysTrue).toBe(true);
    });

    it('optimizes AND with FALSE', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'AND_EXPR',
            args: [
              { AuthzDirectOwner: { entity_field: 'owner_id' } },
              { AuthzDenyAll: {} },
            ],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('FALSE');
      expect(result.isAlwaysFalse).toBe(true);
    });

    it('optimizes OR with TRUE', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'OR_EXPR',
            args: [
              { AuthzDirectOwner: { entity_field: 'owner_id' } },
              { AuthzAllowAll: {} },
            ],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toBe('TRUE');
      expect(result.isAlwaysTrue).toBe(true);
    });

    it('handles nested composites', () => {
      const node: AuthzNode = {
        AuthzComposite: {
          BoolExpr: {
            boolop: 'OR_EXPR',
            args: [
              { AuthzDirectOwner: { entity_field: 'owner_id' } },
              {
                AuthzComposite: {
                  BoolExpr: {
                    boolop: 'AND_EXPR',
                    args: [
                      { AuthzMembership: { membership_type: 1, is_admin: true } },
                      { AuthzPublishable: {} },
                    ],
                  },
                },
              },
            ],
          },
        },
      };
      const result = generateSql(node, defaultOptions);
      expect(result.sql).toContain(' OR ');
      expect(result.sql).toContain(' AND ');
    });
  });

  describe('AuthzSql convenience functions', () => {
    it('directOwner generates correct SQL', () => {
      const sql = AuthzSql.directOwner('owner_id');
      expect(sql).toBe('"owner_id" = current_user_id()');
    });

    it('membership generates correct SQL', () => {
      const sql = AuthzSql.membership(1, { is_admin: true });
      expect(sql).toContain('"app_memberships_sprt"');
      expect(sql).toContain('is_admin');
    });

    it('membershipByField generates correct SQL', () => {
      const sql = AuthzSql.membershipByField('org_id', { membership_type: 2 });
      expect(sql).toContain('"org_id" = ANY');
    });

    it('temporal generates correct SQL', () => {
      const sql = AuthzSql.temporal({ valid_from_field: 'starts_at' });
      expect(sql).toBe('"starts_at" <= NOW()');
    });

    it('publishable generates correct SQL', () => {
      const sql = AuthzSql.publishable();
      expect(sql).toContain('"is_published" IS TRUE');
    });

    it('composite generates correct SQL', () => {
      const sql = AuthzSql.composite('OR_EXPR', [
        { AuthzDirectOwner: { entity_field: 'owner_id' } },
        { AuthzAllowAll: {} },
      ]);
      expect(sql).toBe('TRUE');
    });
  });
});
