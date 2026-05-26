import { resolveModuleForInvocation } from '../src/schema-resolver';

// Mock pg Pool
const mockQuery = jest.fn();
const mockPool = { query: mockQuery } as any;

describe('resolveModuleForInvocation', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns null when no modules found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await resolveModuleForInvocation(mockPool, 'db-123');
    expect(result).toBeNull();
  });

  it('returns the first module when no hints provided', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          schema_name: 'infra_public',
          definitions_table_name: 'function_definitions',
          invocations_table_name: 'function_invocations'
        }
      ]
    });

    const result = await resolveModuleForInvocation(mockPool, 'db-123');
    expect(result).toEqual({
      schema_name: 'infra_public',
      definitions_table_name: 'function_definitions',
      invocations_table_name: 'function_invocations'
    });
  });

  it('matches by schema hint', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          schema_name: 'infra_public',
          definitions_table_name: 'function_definitions',
          invocations_table_name: 'function_invocations'
        },
        {
          schema_name: 'dataroom_public',
          definitions_table_name: 'team_function_definitions',
          invocations_table_name: 'team_function_invocations'
        }
      ]
    });

    const result = await resolveModuleForInvocation(
      mockPool,
      'db-123',
      'dataroom_public'
    );
    expect(result?.schema_name).toBe('dataroom_public');
    expect(result?.invocations_table_name).toBe('team_function_invocations');
  });

  it('matches by schema + table hints', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          schema_name: 'dataroom_public',
          definitions_table_name: 'function_definitions',
          invocations_table_name: 'function_invocations'
        },
        {
          schema_name: 'dataroom_public',
          definitions_table_name: 'team_function_definitions',
          invocations_table_name: 'team_function_invocations'
        }
      ]
    });

    const result = await resolveModuleForInvocation(
      mockPool,
      'db-123',
      'dataroom_public',
      'team_function_invocations'
    );
    expect(result?.definitions_table_name).toBe('team_function_definitions');
  });

  it('falls back to first module when hints do not match', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          schema_name: 'infra_public',
          definitions_table_name: 'function_definitions',
          invocations_table_name: 'function_invocations'
        }
      ]
    });

    const result = await resolveModuleForInvocation(
      mockPool,
      'db-123',
      'nonexistent_schema'
    );
    expect(result?.schema_name).toBe('infra_public');
  });
});
