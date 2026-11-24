import type { Pool } from 'pg';

import type { ApiStructure } from '../../types';
import { API_ROLE_VALIDATION_SQL, validateApiRoles } from '../api-roles';

const api = {
  apiId: 'api-1', roleName: 'served_role', anonRole: 'served_anon', schema: ['served_schema']
} as ApiStructure;

describe('validateApiRoles', () => {
  it('checks both roles and served schemas in one query', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    await expect(validateApiRoles({ query } as unknown as Pool, api)).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(API_ROLE_VALIDATION_SQL, [
      ['served_role', 'served_anon'], ['served_schema']
    ]);
  });

  describe.each([
    ['role_name', 'served_role'], ['anon_role', 'served_anon']
  ])('%s', (column, rolname) => {
    it.each([
      'superuser or BYPASSRLS', 'member of privileged role', 'owner of served RLS table'
    ])('attributes the SQL reason: %s', async (reason) => {
      const query = jest.fn().mockResolvedValue({ rows: [{ rolname, reason }] });
      await expect(validateApiRoles({ query } as unknown as Pool, api)).rejects.toMatchObject({
        code: 'API_ROLE_FORBIDDEN', column, apiId: 'api-1',
        message: `API api-1 ${column} can bypass RLS: ${reason}.`
      });
    });
  });

  it('propagates query errors rather than accepting the roles', async () => {
    const error = new Error('catalog query failed');
    const query = jest.fn().mockRejectedValue(error);
    await expect(validateApiRoles({ query } as unknown as Pool, api)).rejects.toBe(error);
  });
});
