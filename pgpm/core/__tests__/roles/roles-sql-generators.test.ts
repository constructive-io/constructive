import {
  generateCreateBaseRolesSQL,
  generateCreateUserSQL,
  generateCreateTestUsersSQL,
  generateRemoveUserSQL
} from '../../src/roles';

describe('Role SQL Generators - Input Validation', () => {
  describe('generateCreateBaseRolesSQL', () => {
    it('should throw an error when roles is undefined', () => {
      expect(() => {
        generateCreateBaseRolesSQL(undefined as any);
      }).toThrow('generateCreateBaseRolesSQL: roles parameter is undefined');
    });

    it('should throw an error when roles is null', () => {
      expect(() => {
        generateCreateBaseRolesSQL(null as any);
      }).toThrow('generateCreateBaseRolesSQL: roles parameter is undefined');
    });

    it('should throw an error when roles.anonymous is missing', () => {
      expect(() => {
        generateCreateBaseRolesSQL({
          authenticated: 'authenticated',
          administrator: 'administrator'
        });
      }).toThrow('generateCreateBaseRolesSQL: roles is missing required properties');
    });

    it('should throw an error when roles.authenticated is missing', () => {
      expect(() => {
        generateCreateBaseRolesSQL({
          anonymous: 'anonymous',
          administrator: 'administrator'
        });
      }).toThrow('generateCreateBaseRolesSQL: roles is missing required properties');
    });

    it('should throw an error when roles.administrator is missing', () => {
      expect(() => {
        generateCreateBaseRolesSQL({
          anonymous: 'anonymous',
          authenticated: 'authenticated'
        });
      }).toThrow('generateCreateBaseRolesSQL: roles is missing required properties');
    });

    it('should generate valid SQL when all roles are provided', () => {
      const sql = generateCreateBaseRolesSQL({
        anonymous: 'anon',
        authenticated: 'auth',
        administrator: 'admin'
      });
      expect(sql).toContain('anon');
      expect(sql).toContain('auth');
      expect(sql).toContain('admin');
      expect(sql).toContain('CREATE ROLE');
    });
  });

  describe('generateCreateUserSQL', () => {
    it('should throw an error when roles is undefined', () => {
      expect(() => {
        generateCreateUserSQL('testuser', 'testpass', undefined as any);
      }).toThrow('generateCreateUserSQL: roles parameter is undefined');
    });

    it('should throw an error when roles.anonymous is missing', () => {
      expect(() => {
        generateCreateUserSQL('testuser', 'testpass', {
          authenticated: 'authenticated'
        });
      }).toThrow('generateCreateUserSQL: roles is missing required properties');
    });

    it('should generate valid SQL when all required roles are provided', () => {
      const sql = generateCreateUserSQL('testuser', 'testpass', {
        anonymous: 'anon',
        authenticated: 'auth'
      });
      expect(sql).toContain('testuser');
      expect(sql).toContain('anon');
      expect(sql).toContain('auth');
    });
  });

  describe('generateCreateTestUsersSQL', () => {
    const validRoles = {
      anonymous: 'anon',
      authenticated: 'auth',
      administrator: 'admin'
    };

    const validConnections = {
      app: { user: 'app_user', password: 'app_pass' },
      admin: { user: 'admin_user', password: 'admin_pass' }
    };

    it('should throw an error when roles is undefined', () => {
      expect(() => {
        generateCreateTestUsersSQL(undefined as any, validConnections);
      }).toThrow('generateCreateTestUsersSQL: roles parameter is undefined');
    });

    it('should throw an error when connections is undefined', () => {
      expect(() => {
        generateCreateTestUsersSQL(validRoles, undefined as any);
      }).toThrow('generateCreateTestUsersSQL: connections parameter is undefined');
    });

    it('should throw an error when connections.app is missing', () => {
      expect(() => {
        generateCreateTestUsersSQL(validRoles, {
          admin: { user: 'admin_user', password: 'admin_pass' }
        });
      }).toThrow('generateCreateTestUsersSQL: connections is missing required properties');
    });

    it('should throw an error when connections.admin is missing', () => {
      expect(() => {
        generateCreateTestUsersSQL(validRoles, {
          app: { user: 'app_user', password: 'app_pass' }
        });
      }).toThrow('generateCreateTestUsersSQL: connections is missing required properties');
    });

    it('should generate valid SQL when all parameters are provided', () => {
      const sql = generateCreateTestUsersSQL(validRoles, validConnections);
      expect(sql).toContain('app_user');
      expect(sql).toContain('admin_user');
      expect(sql).toContain('anon');
      expect(sql).toContain('auth');
      expect(sql).toContain('admin');
    });
  });

  describe('generateRemoveUserSQL', () => {
    it('should throw an error when roles is undefined', () => {
      expect(() => {
        generateRemoveUserSQL('testuser', undefined as any);
      }).toThrow('generateRemoveUserSQL: roles parameter is undefined');
    });

    it('should throw an error when roles.anonymous is missing', () => {
      expect(() => {
        generateRemoveUserSQL('testuser', {
          authenticated: 'authenticated'
        });
      }).toThrow('generateRemoveUserSQL: roles is missing required properties');
    });

    it('should generate valid SQL when all required roles are provided', () => {
      const sql = generateRemoveUserSQL('testuser', {
        anonymous: 'anon',
        authenticated: 'auth'
      });
      expect(sql).toContain('testuser');
      expect(sql).toContain('anon');
      expect(sql).toContain('auth');
      expect(sql).toContain('DROP ROLE');
    });
  });
});
